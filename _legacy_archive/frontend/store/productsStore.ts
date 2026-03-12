import { create } from 'zustand';
import { api } from '../services/api';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  base_price: number;
  unit: string;
  min_quantity: number;
  images?: string[];
  is_active: boolean;
  is_published: boolean;
  options?: any;
  product_variants?: any[];
  created_at?: string;
}

interface ProductsStore {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (productData: any) => Promise<boolean>;
  updateProduct: (id: string, updates: any) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getActiveProducts: () => Product[];
}

export const useProductsStore = create<ProductsStore>()(
  (set, get) => ({
    products: [],
    loading: false,
    error: null,

    fetchProducts: async () => {
      set({ loading: true, error: null });
      try {
        const response = await api.products.list();
        set({ products: response.data || [], loading: false });
      } catch (error: any) {
        console.error('Failed to fetch products:', error);
        set({ error: error.message, loading: false });
      }
    },

    addProduct: async (productData: any) => {
      try {
        const response = await api.products.create(productData);
        if (response.success) {
          // Refresh the list
          await get().fetchProducts();
          return true;
        }
        return false;
      } catch (error: any) {
        console.error('Failed to add product:', error);
        return false;
      }
    },

    updateProduct: async (id: string, updates: any) => {
      try {
        const response = await api.products.update(id, updates);
        if (response.success) {
          await get().fetchProducts();
          return true;
        }
        return false;
      } catch (error: any) {
        console.error('Failed to update product:', error);
        return false;
      }
    },

    deleteProduct: async (id: string) => {
      try {
        const response = await api.products.delete(id);
        if (response.success) {
          set((state) => ({
            products: state.products.filter((p) => p.id !== id),
          }));
          return true;
        }
        return false;
      } catch (error: any) {
        console.error('Failed to delete product:', error);
        return false;
      }
    },

    getActiveProducts: () => {
      return get().products.filter((p) => p.is_active);
    },
  })
);
