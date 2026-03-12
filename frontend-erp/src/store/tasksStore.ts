import { create } from 'zustand';
import { api } from '../services/api';

export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed';
export type TaskType = 'design' | 'pre_press' | 'screen_making' | 'printing' | 'quality_check' | 'packing' | 'shipping';

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderId: string;
  orderItemId?: string;
  orderNumber?: string;
  customer?: string;
  assignedTo?: string;
  assignedToId?: string;
  estimatedHours?: number;
  actualHours?: number;
  startedAt?: string;
  completedAt?: string;
  deadlineAt?: string;
  notes?: string;
  designFileUrl?: string;
  approvalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  // Nested relations
  orders?: any;
  profiles?: any;
  order_items?: any;
}

interface TasksStore {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTasksStore = create<TasksStore>()(
  (set, get) => ({
    tasks: [],
    isLoading: false,

    fetchTasks: async () => {
      set({ isLoading: true });
      try {
        const response = await api.tasks.list();
        if (response.success && response.data) {
          const rawTasks = Array.isArray(response.data) ? response.data : [];
          const tasks: Task[] = rawTasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            type: t.type,
            status: t.status,
            priority: t.priority,
            orderId: t.order_id,
            orderItemId: t.order_item_id,
            orderNumber: t.orders?.order_number,
            assignedTo: t.profiles?.name,
            assignedToId: t.assigned_to_id,
            estimatedHours: t.estimated_hours,
            actualHours: t.actual_hours,
            startedAt: t.started_at,
            completedAt: t.completed_at,
            deadlineAt: t.deadline_at,
            notes: t.notes,
            designFileUrl: t.design_file_url,
            approvalStatus: t.approval_status,
            rejectionReason: t.rejection_reason,
            orders: t.orders,
            profiles: t.profiles,
            order_items: t.order_items,
          }));
          set({ tasks });
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    addTask: (task) => {
      set((state) => ({
        tasks: [...state.tasks, task],
      }));
    },

    updateTask: async (taskId, updates) => {
      // Optimistic upate local state
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      }));

      // Prepare DB mapped payload
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.assignedToId !== undefined) dbUpdates.assigned_to_id = updates.assignedToId;
        if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
        if (updates.actualHours !== undefined) dbUpdates.actual_hours = updates.actualHours;
        if (updates.startedAt !== undefined) dbUpdates.started_at = updates.startedAt;
        if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
        if (updates.deadlineAt !== undefined) dbUpdates.deadline_at = updates.deadlineAt;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.designFileUrl !== undefined) dbUpdates.design_file_url = updates.designFileUrl;
        if (updates.approvalStatus !== undefined) dbUpdates.approval_status = updates.approvalStatus;
        if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;

        await api.tasks.update(taskId, dbUpdates);
      } catch (err) {
        console.error('Failed to update task:', err);
        // Revert to stable dataset from backend
        await get().fetchTasks();
        throw err; // Propagate up if the caller needs it
      }
    },

    moveTask: async (taskId, newStatus) => {
      // Optimistic update
      set((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, status: newStatus };
        }),
      }));

      try {
        await api.tasks.updateStatus(taskId, newStatus);
      } catch (error) {
        console.error('Failed to move task:', error);
        // Revert on failure by refetching
        await get().fetchTasks();
      }
    },

    deleteTask: (taskId) => {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
      }));
    },

    getTasksByStatus: (status) => {
      return get().tasks.filter((task) => task.status === status);
    },
  })
);
