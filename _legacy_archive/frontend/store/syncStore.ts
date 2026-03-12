// This file handles syncing data between storefront and ERP
// Since both apps run on the same domain, they can share localStorage

import { Order } from './ordersStore';

const STOREFRONT_ORDERS_KEY = 'printflow-store-orders';

export const syncStorefrontOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STOREFRONT_ORDERS_KEY);
    if (!stored) return [];
    
    const data = JSON.parse(stored);
    const storefrontOrders = data.state?.orders || [];
    
    // Convert storefront order format to ERP format
    return storefrontOrders.map((order: any): Order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      phone: order.phone,
      wilaya: order.wilaya,
      address: order.address,
      total: order.total,
      status: order.status,
      date: order.date,
      items: order.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      productionProgress: order.productionProgress || 0,
      tasks: [], // Tasks will be created when order is confirmed
    }));
  } catch (error) {
    console.error('Error syncing storefront orders:', error);
    return [];
  }
};

// Listen for storage changes from other tabs
export const listenToStorefrontOrders = (callback: (orders: Order[]) => void) => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STOREFRONT_ORDERS_KEY) {
      callback(syncStorefrontOrders());
    }
  };
  
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
};
