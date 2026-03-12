import { create } from 'zustand';
import { api } from '../services/api';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  unit_weight?: number;
  total_weight?: number;
  customization?: {
    size?: string;
    color?: string;
    colors?: string[];
    printSide?: string;
    printColor?: string;
    designUrl?: string;
    designFileName?: string;
    notes?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  assignedToId?: string;
  order_item_id?: string;
  approval_status?: string;
  design_file_url?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string | { name?: string;[key: string]: any };
  phone: string;
  wilaya: string;
  address: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  total_weight?: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  payment_status?: 'unpaid' | 'partial' | 'paid';
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  internal_notes?: string;
  date: string;
  items: OrderItem[];
  productionProgress: number;
  tasks: Task[];
  source?: 'erp' | 'storefront';
  customerId?: string;
  material_cost?: number;
  gross_margin?: number;
}

interface OrdersStore {
  orders: Order[];
  isLoading: boolean;
  setOrders: (orders: Order[]) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  addOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => void;
  generateTasksForOrder: (orderId: string, customTasks?: Task[]) => void;
  updateTaskStatus: (orderId: string, taskId: string, status: Task['status']) => void;
  assignTask: (orderId: string, taskId: string, assignedTo: string) => void;
  fetchOrders: () => Promise<void>;
}

// Generate tasks based on order items (Unified Workflow per item)
export const generateTasks = (_order: Order, items: OrderItem[]): Task[] => {
  let taskId = Date.now();
  const allTasks: Task[] = [];

  const workflowStages = [
    { title: 'مراجعة وتجهيز التصميم (Design Prep)', type: 'design' },
    { title: 'تجهيز الشبلونات (Screen Prep)', type: 'preparation' },
    { title: 'جاهزية الخامات (Material Readiness)', type: 'materials' },
    { title: 'الطباعة (Printing)', type: 'printing' },
    { title: 'التجفيف والمعالجة (Drying)', type: 'drying' },
    { title: 'فحص الجودة (Quality Control)', type: 'quality_check' },
    { title: 'التغليف (Packing)', type: 'packing' },
  ];

  items.forEach((item) => {
    workflowStages.forEach((stage) => {
      allTasks.push({
        id: `task-${taskId++}`,
        title: `${stage.title} - ${item.name}`,
        type: stage.type as any,
        status: 'pending',
        order_item_id: item.id,
      });
    });
  });

  return allTasks;
};

export const useOrdersStore = create<OrdersStore>()(
  (set, get) => ({
    orders: [],
    isLoading: false,

    setOrders: (orders) => {
      set({ orders });
    },

    updateOrder: async (orderId, updates) => {
      // 1. Optimistic local update first
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        ),
      }));

      // 2. Persist scalar fields to DB (e.g. status, notes, total)
      const { items, tasks, ...dbUpdates } = updates as any;
      const dbScalars: Record<string, any> = {};
      if (dbUpdates.status !== undefined) dbScalars.status = dbUpdates.status;
      if (dbUpdates.total !== undefined) dbScalars.total = dbUpdates.total;
      if (dbUpdates.internal_notes !== undefined) dbScalars.internal_notes = dbUpdates.internal_notes;
      if (dbUpdates.payment_status !== undefined) dbScalars.payment_status = dbUpdates.payment_status;
      if (dbUpdates.tracking_number !== undefined) dbScalars.tracking_number = dbUpdates.tracking_number;
      if (dbUpdates.shipped_at !== undefined) dbScalars.shipped_at = dbUpdates.shipped_at;
      if (dbUpdates.delivered_at !== undefined) dbScalars.delivered_at = dbUpdates.delivered_at;

      if (Object.keys(dbScalars).length > 0) {
        try {
          await api.orders.updateFields(orderId, dbScalars);
        } catch (error) {
          console.error('[ordersStore] Failed to persist order field updates:', error);
        }
      }

      // 3. Persist items changes if items were updated
      if (items !== undefined) {
        try {
          await api.orderItems.replaceAll(orderId, items);
        } catch (error) {
          console.error('[ordersStore] Failed to persist order items update:', error);
        }
      }
    },

    addOrder: (order) => {
      set((state) => ({
        orders: [...state.orders, order],
      }));
    },

    deleteOrder: async (orderId) => {
      // 1. Optimistic local removal
      set((state) => ({
        orders: state.orders.filter((order) => order.id !== orderId),
      }));
      // 2. Soft-delete in DB (status = 'cancelled') — keeps audit trail
      try {
        await api.orders.softDelete(orderId);
      } catch (error) {
        console.error('[ordersStore] Failed to soft-delete order in DB:', error);
      }
    },

    generateTasksForOrder: async (orderId, customTasks) => {
      const order = get().orders.find((o) => o.id === orderId);
      if (!order) return;

      // Idempotency check: If tasks already exist, do not generate duplicates
      if (order.tasks && order.tasks.length > 0) {
        console.warn('Tasks already exist for order:', orderId);
        return;
      }

      // Use custom tasks if provided, otherwise generate defaults
      const tasksToCreate = customTasks || generateTasks(order, order.items || []);
      if (tasksToCreate.length === 0) return;

      try {
        set({ isLoading: true }); // optimize UI feedback
        await Promise.all(tasksToCreate.map((task: Task) =>
          api.tasks.create({
            title: task.title,
            type: task.type,
            status: 'pending',
            priority: 'normal',
            orderId: order.id,
            order_item_id: task.order_item_id,
          })
        ));

        // Explicitly set order status to 'confirmed' after tasks are created
        await api.orders.updateStatus(order.id, 'confirmed');

        // Refresh orders to get the new tasks with real IDs
        await get().fetchOrders();
      } catch (error) {
        console.error('Failed to generate tasks:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    updateTaskStatus: async (orderId, taskId, status) => {
      // Optimistic update
      set((state) => ({
        orders: state.orders.map((order) => {
          if (order.id !== orderId) return order;

          const updatedTasks = order.tasks.map((task) =>
            task.id === taskId ? { ...task, status } : task
          );

          const completedTasks = updatedTasks.filter((t) => t.status === 'completed').length;
          const progress = updatedTasks.length > 0
            ? Math.round((completedTasks / updatedTasks.length) * 100)
            : 0;

          let orderStatus = order.status;
          if (progress === 100) orderStatus = 'ready';
          else if (progress > 0) orderStatus = 'in_production';

          return {
            ...order,
            tasks: updatedTasks,
            productionProgress: progress,
            status: orderStatus,
          };
        }),
      }));

      // Persist task status to DB
      try {
        await api.tasks.updateStatus(taskId, status);
      } catch (error) {
        console.error('[ordersStore] Failed to update task status in DB:', error);
        return;
      }

      // Persist order status to DB when it transitions due to task progress
      const updatedOrder = get().orders.find((o) => o.id === orderId);
      if (updatedOrder) {
        const completedCount = updatedOrder.tasks.filter((t) => t.status === 'completed').length;
        const progress = updatedOrder.tasks.length > 0
          ? Math.round((completedCount / updatedOrder.tasks.length) * 100)
          : 0;
        const targetOrderStatus =
          progress === 100 ? 'ready' : progress > 0 ? 'in_production' : updatedOrder.status;

        if (targetOrderStatus !== (get().orders.find(o => o.id === orderId) as any)?._dbStatus) {
          try {
            await api.orders.updateStatus(orderId, targetOrderStatus);
            console.log(`[ordersStore] Order ${orderId} status -> ${targetOrderStatus} persisted to DB`);
          } catch (error) {
            console.error('[ordersStore] Failed to sync order status to DB:', error);
          }
        }
      }
    },

    assignTask: async (orderId, taskId, assignedTo) => {
      // Optimistic update
      set((state) => ({
        orders: state.orders.map((order) => {
          if (order.id !== orderId) return order;
          return {
            ...order,
            tasks: order.tasks.map((task) =>
              task.id === taskId ? { ...task, assignedToId: assignedTo } : task
            ),
          };
        }),
      }));

      // Persist to DB
      try {
        const { useAuthStore } = await import('./authStore'); // lazy import to avoid circular dep
        const currentUserId = useAuthStore.getState().user?.id;
        await api.tasks.assignTo(taskId, assignedTo, currentUserId);
      } catch (error) {
        console.error('[ordersStore] Failed to assign task to DB:', error);
      }
    },

    // Fetch orders from backend API — single source of truth
    fetchOrders: async () => {
      set({ isLoading: true });
      try {
        const response = await api.orders.list();
        if (response.success && response.data) {
          const apiOrdersRaw = response.data.data || response.data;
          // Transform API orders to match ERP format
          const apiOrders: Order[] = (Array.isArray(apiOrdersRaw) ? apiOrdersRaw : []).map((o: any) => {
            if (o.tasks && o.tasks.length > 0) {
              console.log('Full Task Object Keys:', Object.keys(o.tasks[0]));
              console.log('Task Sample:', o.tasks[0]);
            }
            let customerName = '';
            if (o.customers && typeof o.customers === 'object' && o.customers.name) {
              customerName = o.customers.name;
            } else if (o.customer && typeof o.customer === 'object' && o.customer.name) {
              customerName = o.customer.name;
            } else if (typeof o.customer === 'string') {
              customerName = o.customer;
            } else if (o.guest_info && o.guest_info.name) {
              customerName = o.guest_info.name;
            }

            let phone = '';
            if (o.customers && typeof o.customers === 'object' && o.customers.phone) {
              phone = o.customers.phone;
            } else if (o.guest_info && o.guest_info.phone) {
              phone = o.guest_info.phone;
            }

            let wilaya = '';
            let address = '';
            if (o.shipping_address) {
              wilaya = o.shipping_address.wilaya || '';
              address = o.shipping_address.address || '';
            }

            return {
              id: o.id,
              orderNumber: o.order_number || o.id,
              customer: customerName,
              phone,
              wilaya,
              address,
              total: parseFloat(o.total) || 0,
              status: o.status || 'pending',
              date: o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              items: (o.order_items || []).map((item: any) => ({
                id: item.id,
                name: item.name || 'Unknown Product',
                quantity: item.quantity || 1,
                price: parseFloat(item.unit_price) || 0,
                customization: item.customization,
              })),
              productionProgress: o.production_status ? o.production_status.progressPercentage : 0,
              tasks: (o.tasks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                type: t.type,
                status: t.status,
                assignedTo: t.profiles ? (Array.isArray(t.profiles) ? t.profiles[0]?.name : t.profiles.name) : undefined,
                assignedToId: t.assigned_to || t.assigned_to_id, // Fallback for safety
              })),
              source: o.source || 'erp',
              customerId: o.customer_id,
              material_cost: parseFloat(o.material_cost) || 0,
              gross_margin: parseFloat(o.gross_margin) || 0,
            };
          });

          set({ orders: apiOrders });
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        set({ isLoading: false });
      }
    },
  })
);
