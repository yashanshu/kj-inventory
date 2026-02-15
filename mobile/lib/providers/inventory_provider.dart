import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/item.dart';
import '../models/category.dart';
import 'providers.dart';

@immutable
class InventoryState {
  final List<Item> items;
  final int total;
  final bool isLoading;
  final String? error;
  final String searchQuery;
  final String? categoryFilter;
  final bool lowStockOnly;

  const InventoryState({
    this.items = const [],
    this.total = 0,
    this.isLoading = false,
    this.error,
    this.searchQuery = '',
    this.categoryFilter,
    this.lowStockOnly = false,
  });

  bool get hasMore => items.length < total;

  InventoryState copyWith({
    List<Item>? items,
    int? total,
    bool? isLoading,
    String? error,
    String? searchQuery,
    String? categoryFilter,
    bool? lowStockOnly,
    bool clearError = false,
    bool clearCategoryFilter = false,
  }) {
    return InventoryState(
      items: items ?? this.items,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      searchQuery: searchQuery ?? this.searchQuery,
      categoryFilter:
          clearCategoryFilter ? null : (categoryFilter ?? this.categoryFilter),
      lowStockOnly: lowStockOnly ?? this.lowStockOnly,
    );
  }
}

class InventoryNotifier extends StateNotifier<InventoryState> {
  final Ref _ref;

  InventoryNotifier(this._ref) : super(const InventoryState());

  Future<void> fetchItems({bool refresh = false}) async {
    if (state.isLoading) return;
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final repo = _ref.read(inventoryRepositoryProvider);
      final result = await repo.getItems(
        search: state.searchQuery.isEmpty ? null : state.searchQuery,
        categoryId: state.categoryFilter,
        lowStock: state.lowStockOnly ? true : null,
        limit: 50,
        offset: refresh ? 0 : state.items.length,
      );

      state = state.copyWith(
        items: refresh ? result.items : [...state.items, ...result.items],
        total: result.total,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setSearch(String query) {
    state = state.copyWith(searchQuery: query, items: [], total: 0);
    fetchItems(refresh: true);
  }

  void setCategoryFilter(String? categoryId) {
    state = state.copyWith(
      categoryFilter: categoryId,
      clearCategoryFilter: categoryId == null,
      items: [],
      total: 0,
    );
    fetchItems(refresh: true);
  }

  void toggleLowStock() {
    state = state.copyWith(
      lowStockOnly: !state.lowStockOnly,
      items: [],
      total: 0,
    );
    fetchItems(refresh: true);
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.isLoading) return;
    await fetchItems();
  }

  Future<void> refresh() => fetchItems(refresh: true);
}

final inventoryProvider =
    StateNotifierProvider<InventoryNotifier, InventoryState>((ref) {
  return InventoryNotifier(ref);
});

// Categories
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final repo = ref.watch(inventoryRepositoryProvider);
  return repo.getCategories();
});
