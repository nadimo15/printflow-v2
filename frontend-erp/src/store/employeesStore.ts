import { create } from 'zustand';
import { api } from '../services/api';

export interface Employee {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'worker' | 'designer';
    phone?: string;
    avatar?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface EmployeesState {
    employees: Employee[];
    isLoading: boolean;
    error: string | null;
    fetchEmployees: () => Promise<void>;
    createEmployee: (data: { name: string; email: string; password: string; role: string; phone?: string }) => Promise<void>;
    updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
    deleteEmployee: (id: string) => Promise<void>;
    reactivateEmployee: (id: string) => Promise<void>;
}

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
    employees: [],
    isLoading: false,
    error: null,

    fetchEmployees: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.employees.list();
            set({ employees: result.data || [], isLoading: false });
        } catch (error: any) {
            console.error('Failed to fetch employees:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    createEmployee: async (data) => {
        set({ isLoading: true, error: null });
        try {
            await api.employees.create(data);
            await get().fetchEmployees();
        } catch (error: any) {
            console.error('Failed to create employee:', error);
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateEmployee: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            await api.employees.update(id, data);
            await get().fetchEmployees();
        } catch (error: any) {
            console.error('Failed to update employee:', error);
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    deleteEmployee: async (id) => {
        try {
            await api.employees.delete(id);
            await get().fetchEmployees();
        } catch (error: any) {
            console.error('Failed to disable employee:', JSON.stringify(error, null, 2));
            throw error;
        }
    },

    reactivateEmployee: async (id) => {
        try {
            await api.employees.reactivate(id);
            await get().fetchEmployees();
        } catch (error: any) {
            console.error('Failed to reactivate employee:', error);
            throw error;
        }
    },
}));
