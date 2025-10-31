// Type definitions matching backend API

export type Unit = 'pcs' | 'kg' | 'gm' | 'ltr';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  sku?: string;
  unit: Unit;
  minimumThreshold: number;
  currentStock: number;
  unitCost?: number;
  isActive: boolean;
  trackStock: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface StockMovement {
  id: string;
  itemId: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  item?: Item;
  user?: User;
}

export interface Alert {
  id: string;
  organizationId: string;
  itemId: string;
  alertType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  item?: Item;
}

export interface DashboardMetrics {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  recentMovements: number;
}

export interface StockTrend {
  date: string;
  in: number;
  out: number;
  adjustments: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  totalValue: number;
  color?: string;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role?: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateItemRequest {
  categoryId: string;
  name: string;
  sku?: string;
  unit: Unit;
  minimumThreshold: number;
  currentStock: number;
  unitCost?: number;
  trackStock?: boolean;
}

export interface UpdateItemRequest {
  categoryId?: string;
  name?: string;
  sku?: string;
  unit?: Unit;
  minimumThreshold?: number;
  unitCost?: number;
  isActive?: boolean;
  trackStock?: boolean;
}

export interface CreateMovementRequest {
  itemId: string;
  movementType: MovementType;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface DeleteCategoryRequest {
  targetCategoryId?: string;
}

export interface ListItemsQuery {
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListMovementsQuery {
  itemId?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedItemsResponse {
  items: Item[];
  total: number;
}
