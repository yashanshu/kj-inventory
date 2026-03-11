import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesService } from '../services/stores';

export const storeKeys = {
  all: ['stores'] as const,
  list: () => [...storeKeys.all, 'list'] as const,
  bindings: (storeId?: string) => ['bindings', storeId] as const,
};

export function useStores() {
  return useQuery({
    queryKey: storeKeys.list(),
    queryFn: () => storesService.getStores(),
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; isPrimary?: boolean }) =>
      storesService.createStore(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.all }),
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string; isPrimary?: boolean } }) =>
      storesService.updateStore(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.all }),
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storesService.deleteStore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.all }),
  });
}

export function useBindings(storeId?: string) {
  return useQuery({
    queryKey: storeKeys.bindings(storeId),
    queryFn: () => storesService.getBindings(storeId),
  });
}

export function useCreateBinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { storeId: string; platform: string; restaurantId: string; restaurantName?: string }) =>
      storesService.createBinding(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bindings'] }),
  });
}

export function useUpdateBinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { restaurantName?: string; isActive?: boolean } }) =>
      storesService.updateBinding(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bindings'] }),
  });
}

export function useDeleteBinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storesService.deleteBinding(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bindings'] }),
  });
}
