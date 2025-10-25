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
} from '../types/inventory';

export const inventoryService = {
  // Items
  async getItems(query?: ListItemsQuery): Promise<Item[]> {
    return apiClient.get<Item[]>('/api/v1/items', query);
  },

  async getItem(id: string): Promise<Item> {
    return apiClient.get<Item>(`/api/v1/items/${id}`);
  },

  async createItem(data: CreateItemRequest): Promise<Item> {
    return apiClient.post<Item>('/api/v1/items', data);
  },

  async updateItem(id: string, data: UpdateItemRequest): Promise<Item> {
    return apiClient.put<Item>(`/api/v1/items/${id}`, data);
  },

  async deleteItem(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/items/${id}`);
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>('/api/v1/categories');
  },

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    return apiClient.post<Category>('/api/v1/categories', data);
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    return apiClient.put<Category>(`/api/v1/categories/${id}`, data);
  },

  async deleteCategory(id: string, data?: DeleteCategoryRequest): Promise<void> {
    return apiClient.delete<void>(`/api/v1/categories/${id}`, data);
  },

  // Stock Movements
  async createMovement(data: CreateMovementRequest): Promise<StockMovement> {
    return apiClient.post<StockMovement>('/api/v1/movements', data);
  },

  async getMovements(query?: ListMovementsQuery): Promise<StockMovement[]> {
    return apiClient.get<StockMovement[]>('/api/v1/movements', query);
  },

  async getItemMovements(itemId: string, query?: ListMovementsQuery): Promise<StockMovement[]> {
    return apiClient.get<StockMovement[]>(`/api/v1/items/${itemId}/movements`, query);
  },
};
