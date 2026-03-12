import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customization?: any;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  phone: string;
  wilaya: string;
  address: string;
  email?: string;
  total: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered';
  date: string;
  items: OrderItem[];
  notes?: string;
  productionProgress: number;
  designUrl?: string;
}

interface OrdersStore {
  orders: Order[];
  currentOrder: Order | null;
  addOrder: (order: Order) => Promise<boolean>;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  setCurrentOrder: (order: Order | null) => void;
  getOrderById: (orderId: string) => Order | undefined;
  trackOrder: (orderId: string, phone: string) => Promise<Order | null>;
  fetchOrdersFromApi: () => Promise<void>;
}



export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],
      currentOrder: null,

      // Save order to backend API
      addOrder: async (order) => {
        try {
          // Save to backend first
          const response = await api.orders.create({
            ...order,
            source: 'storefront',
          });

          if (response.success && response.data) {
            // Handle nested data from Edge Function (response.data.data)
            const responseData = (response.data as any).data || response.data;
            const savedOrder = {
              ...order,
              id: responseData.id || order.id,
              orderNumber: responseData.orderNumber || responseData.order_number || order.orderNumber,
            };
            set((state) => ({
              orders: [...state.orders, savedOrder],
              currentOrder: savedOrder,
            }));
            return true;
          } else if (response.success) {
            // Success but no data returned
            set((state) => ({
              orders: [...state.orders, order],
              currentOrder: order,
            }));
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to save order to API:', error);
          // Do NOT save locally if backend fails - we need to alert the user
          return false;
        }
      },

      updateOrder: (orderId, updates) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, ...updates } : order
          ),
        }));
      },

      setCurrentOrder: (order) => {
        set({ currentOrder: order });
      },

      getOrderById: (orderId) => {
        return get().orders.find((order) => order.id === orderId);
      },

      // Track order from backend API
      trackOrder: async (orderId, phone) => {
        try {
          const response = await api.orders.track(orderId);
          if (response.success && response.data) {
            return response.data;
          }

          // Fallback to local storage
          const localOrder = get().orders.find(
            (order) => order.id === orderId && order.phone === phone
          );
          return localOrder || null;
        } catch (error) {
          console.error('Track order error:', error);
          // Fallback to local
          return get().orders.find(
            (order) => order.id === orderId && order.phone === phone
          ) || null;
        }
      },

      // Fetch orders from backend
      fetchOrdersFromApi: async () => {
        try {
          const response = await api.orders.list();
          if (response.success && response.data) {
            set({ orders: response.data });
          }
        } catch (error) {
          console.error('Failed to fetch orders:', error);
        }
      },
    }),
    {
      name: 'printflow-store-orders',
    }
  )
);
