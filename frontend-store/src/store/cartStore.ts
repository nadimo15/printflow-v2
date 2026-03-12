import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  unit_weight?: number; // kg per piece — used for total_weight and shipping calculation
  image?: string;
  customization?: {
    designUrl?: string;
    designFileName?: string;
    notes?: string;
    [key: string]: any;
  };
  cartItemId?: string; // Deterministic hash/string of productId + customization
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getTotalWeight: () => number;
}

// Helper to generate a deterministic cart item ID
const generateCartItemId = (item: CartItem): string => {
  if (item.cartItemId) return item.cartItemId;

  const custom = item.customization || {};
  // Exclude large or transient fields from the hash (like designUrl)
  const hashObj = Object.assign({}, custom);
  delete hashObj.designUrl;
  delete hashObj.designFile;
  delete hashObj.notes;

  // Sort keys to ensure consistent hashing
  const sortedKeys = Object.keys(hashObj).sort();
  const values = sortedKeys.map(k => `${k}:${hashObj[k]}`).join('|');

  return `${item.productId}-${item.variantId || 'base'}-[${values}]`;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const generatedId = generateCartItemId(item);
        const finalItem = { ...item, cartItemId: generatedId };

        const items = get().items;
        const existingIndex = items.findIndex((i) => (i.cartItemId || generateCartItemId(i)) === generatedId);

        if (existingIndex >= 0) {
          const newItems = [...items];
          // Bug Fix: Only accumulate or overwrite quantity intelligently.
          // Since it's exactly the same configuration, we ADD to the quantity.
          newItems[existingIndex].quantity += item.quantity;
          set({ items: newItems });
        } else {
          set({ items: [...items, finalItem] });
        }
      },

      removeItem: (cartItemId) => {
        set({
          items: get().items.filter(
            (i) => (i.cartItemId || generateCartItemId(i)) !== cartItemId
          ),
        });
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            (i.cartItemId || generateCartItemId(i)) === cartItemId
              ? { ...i, quantity }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getTotalWeight: () => {
        return get().items.reduce((acc, item) => acc + (item.unit_weight || 0) * item.quantity, 0);
      },
    }),
    {
      name: 'printflow-cart',
    }
  )
);
