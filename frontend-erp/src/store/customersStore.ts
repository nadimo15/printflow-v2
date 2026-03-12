import { create } from 'zustand';
import { api } from '../services/api';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  wilaya?: string;
  address?: string;
  company?: string;
  is_guest?: boolean;
  total_orders?: number;
  total_spent?: number;
  outstanding_balance?: number;
  orders?: any[];
}

interface CustomersStore {
  customers: Customer[];
  isLoading: boolean;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  getCustomerByName: (name: string) => Customer | undefined;
}

export const useCustomersStore = create<CustomersStore>()(
  (set, get) => ({
    customers: [],
    isLoading: false,

    fetchCustomers: async () => {
      set({ isLoading: true });
      try {
        const response = await api.customers.list();
        if (response.success && response.data) {
          set({ customers: response.data.data || response.data || [] });
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    addCustomer: (customer) => {
      set((state) => ({
        customers: [...state.customers, customer],
      }));
    },

    updateCustomer: (id, updates) => {
      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },

    getCustomerByName: (name) => {
      return get().customers.find((c) => c.name === name);
    },
  })
);
