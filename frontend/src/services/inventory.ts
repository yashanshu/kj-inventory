// Inventory service

import { apiClient } from './api';
import type {
  Item,
  CreateItemRequest,
  UpdateItemRequest,
  ListItemsQuery,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  DeleteCategoryRequest,
  StockMovement,
  CreateMovementRequest,
  ListMovementsQuery,
  PaginatedItemsResponse,
} from '../types/inventory';

export const inventoryService = {
  // Items
  async getItems(query?: ListItemsQuery): Promise<PaginatedItemsResponse> {
    return apiClient.get<PaginatedItemsResponse>('/items', query);
  },

  async getItem(id: string): Promise<Item> {
    return apiClient.get<Item>(`/items/${id}`);
  },

  async createItem(data: CreateItemRequest): Promise<Item> {
    return apiClient.post<Item>('/items', data);
  },

  async updateItem(id: string, data: UpdateItemRequest): Promise<Item> {
    return apiClient.put<Item>(`/items/${id}`, data);
  },

  async deleteItem(id: string): Promise<void> {
    return apiClient.delete<void>(`/items/${id}`);
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>('/categories');
  },

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    return apiClient.post<Category>('/categories', data);
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    return apiClient.put<Category>(`/categories/${id}`, data);
  },

  async deleteCategory(id: string, data?: DeleteCategoryRequest): Promise<void> {
    return apiClient.delete<void>(`/categories/${id}`, data);
  },

  // Stock Movements
  async createMovement(data: CreateMovementRequest): Promise<StockMovement> {
    return apiClient.post<StockMovement>('/movements', data);
  },

  async getMovements(query?: ListMovementsQuery): Promise<StockMovement[]> {
    return apiClient.get<StockMovement[]>('/movements', query);
  },

  async getItemMovements(itemId: string, query?: ListMovementsQuery): Promise<StockMovement[]> {
    return apiClient.get<StockMovement[]>(`/items/${itemId}/movements`, query);
  },
};
