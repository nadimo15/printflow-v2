import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,


      login: async (email, password) => {
        try {
          const response = await api.auth.login({ email, password });
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.token,
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },


      register: async (data) => {
        try {
          const response = await api.auth.register(data);
          // Auto login after register if backend returns user/session, 
          // but our backend register currently returns user object only, not session usually unless we changed it.
          // Let's check backend auth.ts... 
          // Backend register returns { success: true, data: user }. It Does NOT return a token.
          // So user must login after register.
          return !!response.success;
        } catch (error) {
          console.error('Registration failed:', error);
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },
    }),
    { name: 'erp-auth' }
  )
);
