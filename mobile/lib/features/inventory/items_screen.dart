import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/inventory_provider.dart';
import 'widgets/item_tile.dart';

class ItemsScreen extends ConsumerStatefulWidget {
  const ItemsScreen({super.key});

  @override
  ConsumerState<ItemsScreen> createState() => _ItemsScreenState();
}

class _ItemsScreenState extends ConsumerState<ItemsScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(inventoryProvider.notifier).fetchItems(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(inventoryProvider);
    final categories = ref.watch(categoriesProvider);
    final authState = ref.watch(authProvider);
    final isAdmin = authState.user?.role == Role.admin;

    return Column(
      children: [
        // Search and filters
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search items...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(inventoryProvider.notifier).setSearch('');
                          },
                        )
                      : null,
                  isDense: true,
                ),
                onChanged: (value) {
                  ref.read(inventoryProvider.notifier).setSearch(value);
                },
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: categories.when(
                      data: (cats) => DropdownButtonFormField<String>(
                        value: state.categoryFilter,
                        decoration: const InputDecoration(
                          hintText: 'Category',
                          isDense: true,
                          contentPadding:
                              EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        isExpanded: true,
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text('All Categories'),
                          ),
                          ...cats.map((c) => DropdownMenuItem(
                                value: c.id,
                                child: Text(c.name),
                              )),
                        ],
                        onChanged: (value) {
                          ref
                              .read(inventoryProvider.notifier)
                              .setCategoryFilter(value);
                        },
                      ),
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilterChip(
                    label: const Text('Low Stock'),
                    selected: state.lowStockOnly,
                    onSelected: (_) {
                      ref.read(inventoryProvider.notifier).toggleLowStock();
                    },
                  ),
                ],
              ),
            ],
          ),
        ),

        // Items list
        Expanded(
          child: state.isLoading && state.items.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : state.error != null && state.items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Failed to load items'),
                          const SizedBox(height: 8),
                          FilledButton.tonal(
                            onPressed: () =>
                                ref.read(inventoryProvider.notifier).refresh(),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    )
                  : state.items.isEmpty
                      ? const Center(child: Text('No items found'))
                      : RefreshIndicator(
                          onRefresh: () =>
                              ref.read(inventoryProvider.notifier).refresh(),
                          child: NotificationListener<ScrollNotification>(
                            onNotification: (notification) {
                              if (notification is ScrollEndNotification &&
                                  notification.metrics.extentAfter < 200) {
                                ref
                                    .read(inventoryProvider.notifier)
                                    .loadMore();
                              }
                              return false;
                            },
                            child: ListView.builder(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12),
                              itemCount: state.items.length +
                                  (state.hasMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index >= state.items.length) {
                                  return const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(16),
                                      child: CircularProgressIndicator(),
                                    ),
                                  );
                                }
                                final item = state.items[index];
                                return ItemTile(
                                  item: item,
                                  onTap: () =>
                                      context.push('/inventory/${item.id}'),
                                );
                              },
                            ),
                          ),
                        ),
        ),
      ],
    );
  }
}

// FAB is added in the router via scaffold builder if user is admin
class AddItemFab extends ConsumerWidget {
  const AddItemFab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAdmin = ref.watch(authProvider).user?.role == Role.admin;
    if (!isAdmin) return const SizedBox.shrink();

    return FloatingActionButton(
      onPressed: () => context.push('/inventory/new'),
      child: const Icon(Icons.add),
    );
  }
}
