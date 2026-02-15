import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/movement.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/movement_provider.dart';
import '../../providers/providers.dart';

class ItemDetailScreen extends ConsumerWidget {
  final String itemId;

  const ItemDetailScreen({super.key, required this.itemId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(inventoryProvider);
    final item = state.items.where((i) => i.id == itemId).firstOrNull;
    final movements = ref.watch(itemMovementsProvider(itemId));
    final authState = ref.watch(authProvider);
    final isAdmin = authState.user?.role == Role.admin;
    final canRecordMovement = authState.user?.role != Role.user;
    final theme = Theme.of(context);

    if (item == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Item Details')),
        body: const Center(child: Text('Item not found')),
      );
    }

    final statusColor =
        AppTheme.stockStatusColor(item.currentStock, item.minimumThreshold);

    return Scaffold(
      appBar: AppBar(
        title: Text(item.name),
        actions: [
          if (isAdmin)
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => context.push('/inventory/${item.id}/edit'),
            ),
          if (isAdmin)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _confirmDelete(context, ref),
            ),
        ],
      ),
      floatingActionButton: canRecordMovement
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/movements/add?itemId=${item.id}'),
              icon: const Icon(Icons.swap_vert),
              label: const Text('Stock Movement'),
            )
          : null,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stock info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('Current Stock',
                          style: theme.textTheme.titleMedium),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          item.currentStock <= 0
                              ? 'Out of Stock'
                              : item.currentStock <= item.minimumThreshold
                                  ? 'Low Stock'
                                  : 'In Stock',
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${item.currentStock} ${item.unit}',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Min. threshold: ${item.minimumThreshold} ${item.unit}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Details card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Details', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  _detailRow('Category', item.category?.name ?? '-'),
                  _detailRow('SKU', item.sku ?? '-'),
                  _detailRow('Unit', item.unit),
                  _detailRow('Track Stock', item.trackStock ? 'Yes' : 'No'),
                  if (isAdmin && item.unitCost != null)
                    _detailRow('Unit Cost', '\u20B9${item.unitCost!.toStringAsFixed(2)}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Movement history
          Text('Movement History', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          movements.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Text('Failed to load movements'),
            data: (movementList) {
              if (movementList.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: Text('No movements yet')),
                );
              }
              return Column(
                children: movementList.map((m) => _movementTile(m, theme)).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _movementTile(StockMovement m, ThemeData theme) {
    final icon = switch (m.movementType) {
      MovementType.stockIn => Icons.add_circle_outline,
      MovementType.stockOut => Icons.remove_circle_outline,
      MovementType.adjustment => Icons.tune,
    };
    final color = switch (m.movementType) {
      MovementType.stockIn => AppTheme.successColor,
      MovementType.stockOut => AppTheme.errorColor,
      MovementType.adjustment => AppTheme.primaryColor,
    };
    final label = switch (m.movementType) {
      MovementType.stockIn => 'IN',
      MovementType.stockOut => 'OUT',
      MovementType.adjustment => 'ADJ',
    };

    return Card(
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text('$label: ${m.quantity}'),
        subtitle: Text(m.notes ?? m.reference ?? ''),
        trailing: Text(
          '${m.previousStock} \u2192 ${m.newStock}',
          style: theme.textTheme.bodySmall,
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Item'),
        content: const Text('Are you sure you want to delete this item?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final repo = ref.read(inventoryRepositoryProvider);
                await repo.deleteItem(itemId);
                ref.read(inventoryProvider.notifier).refresh();
                if (context.mounted) context.pop();
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to delete: $e')),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
