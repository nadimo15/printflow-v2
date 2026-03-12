// ============================================
// PRINTFLOW V2 - SHARED TYPES
// Unified types for Storefront + ERP
// ============================================

// User Roles
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  PRODUCTION = 'production',
  DESIGNER = 'designer',
  WORKER = 'worker',
}

// Order Status
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PRODUCTION = 'in_production',
  READY = 'ready',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  REFUNDED = 'refunded',
}

// Payment Methods
export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  BANK_TRANSFER = 'bank_transfer',
  OFFICE_PICKUP = 'office_pickup',
  CREDIT_CARD = 'credit_card',
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  category: ProductCategory;
  basePrice: number;
  minQuantity: number;
  unitOfMeasure: string;
  images: string[];
  isActive: boolean;
  isPublished: boolean;
  stockQuantity?: number;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export enum ProductCategory {
  BAGS = 'bags',
  APPAREL = 'apparel',
  HATS = 'hats',
  ACCESSORIES = 'accessories',
  PACKAGING = 'packaging',
  STATIONERY = 'stationery',
  OTHER = 'other',
}

export interface ProductAttribute {
  id: string;
  name: string;
  nameAr?: string;
  values: AttributeValue[];
}

export interface AttributeValue {
  id: string;
  value: string;
  valueAr?: string;
  priceAdjustment?: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  stockQuantity: number;
  options: Record<string, string>; // { size: 'XL', color: 'red' }
  isActive: boolean;
  imageUrl?: string;
}

// ============================================
// ORDER TYPES
// ============================================

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  
  // Customer Info
  customerId?: string;
  customer?: Customer;
  
  // Guest Info (for storefront orders)
  guestInfo?: GuestInfo;
  
  // Order Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  
  // Shipping
  shippingAddress: Address;
  trackingNumber?: string;
  
  // Metadata
  notes?: string;
  internalNotes?: string;
  source: 'storefront' | 'erp';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface GuestInfo {
  name: string;
  phone: string;
  email?: string;
  wilaya: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  wilaya?: string;
  address?: string;
  isGuest: boolean;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface Address {
  name: string;
  phone: string;
  wilaya: string;
  city?: string;
  address: string;
  postalCode?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  variantId?: string;
  variant?: ProductVariant;
  
  // Item details
  name: string;
  nameAr?: string;
  sku: string;
  
  // Pricing
  unitPrice: number;
  quantity: number;
  total: number;
  
  // Customization
  customization?: ItemCustomization;
  
  // Production
  productionStatus?: ProductionStatus;
  assignedTo?: string;
}

export interface ItemCustomization {
  designUrl?: string;
  designFileName?: string;
  colors: string[];
  printLocation: string[]; // ['front', 'back']
  notes?: string;
}

export enum ProductionStatus {
  PENDING = 'pending',
  DESIGN = 'design',
  APPROVAL = 'approval',
  PRE_PRESS = 'pre_press',
  PRINTING = 'printing',
  QUALITY_CHECK = 'quality_check',
  PACKING = 'packing',
  READY = 'ready',
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Relations
  orderId?: string;
  orderItemId?: string;
  assignedToId?: string;
  assignedTo?: User;
  
  // Time tracking
  estimatedHours: number;
  actualHours: number;
  startedAt?: string;
  completedAt?: string;
  
  // Notes
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export enum TaskType {
  DESIGN = 'design',
  PRE_PRESS = 'pre_press',
  SCREEN_MAKING = 'screen_making',
  PRINTING = 'printing',
  QUALITY_CHECK = 'quality_check',
  PACKING = 'packing',
  SHIPPING = 'shipping',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
}

// ============================================
// INVENTORY TYPES
// ============================================

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unitOfMeasure: string;
  minStockLevel: number;
  reorderPoint: number;
  costPerUnit: number;
  supplier?: Supplier;
  location?: string;
  lastRestocked?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone: string;
  address?: string;
  wilaya?: string;
  isActive: boolean;
}

// ============================================
// DASHBOARD / ANALYTICS
// ============================================

export interface DashboardStats {
  // Orders
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  
  // Revenue
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  
  // Production
  activeJobs: number;
  pendingTasks: number;
  completedToday: number;
  
  // Inventory
  lowStockItems: number;
  outOfStockItems: number;
  
  // Customers
  totalCustomers: number;
  newCustomersThisMonth: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ============================================
// STOREFRONT SPECIFIC
// ============================================

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  customization?: ItemCustomization;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface StorefrontSettings {
  storeName: string;
  storeNameAr: string;
  logo?: string;
  primaryColor: string;
  whatsappNumber: string;
  phoneNumber: string;
  email: string;
  freeShippingThreshold: number;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
}
