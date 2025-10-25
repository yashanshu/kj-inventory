import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventory';
import type {
  CreateItemRequest,
  UpdateItemRequest,
  ListItemsQuery,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  DeleteCategoryRequest,
  CreateMovementRequest,
  ListMovementsQuery,
} from '../types/inventory';

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  items: () => [...inventoryKeys.all, 'items'] as const,
  itemsList: (query?: ListItemsQuery) => [...inventoryKeys.items(), 'list', query] as const,
  item: (id: string) => [...inventoryKeys.items(), 'detail', id] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  movements: () => [...inventoryKeys.all, 'movements'] as const,
  movementsList: (query?: ListMovementsQuery) => [...inventoryKeys.movements(), 'list', query] as const,
  itemMovements: (itemId: string) => [...inventoryKeys.movements(), 'item', itemId] as const,
};

// Items hooks
export function useItems(query?: ListItemsQuery) {
  return useQuery({
    queryKey: inventoryKeys.itemsList(query),
    queryFn: () => inventoryService.getItems(query),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.item(id),
    queryFn: () => inventoryService.getItem(id),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateItemRequest) => inventoryService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemRequest }) =>
      inventoryService.updateItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

// Categories hooks
export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => inventoryService.getCategories(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => inventoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      inventoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: DeleteCategoryRequest }) =>
      inventoryService.deleteCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

// Movements hooks
export function useMovements(query?: ListMovementsQuery) {
  return useQuery({
    queryKey: inventoryKeys.movementsList(query),
    queryFn: () => inventoryService.getMovements(query),
  });
}

export function useItemMovements(itemId: string) {
  return useQuery({
    queryKey: inventoryKeys.itemMovements(itemId),
    queryFn: () => inventoryService.getItemMovements(itemId),
    enabled: !!itemId,
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMovementRequest) => inventoryService.createMovement(data),
    onSuccess: (_, variables) => {
      // Invalidate movements queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });
      // Invalidate the affected item
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(variables.itemId) });
      // Invalidate items list (stock changed)
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
