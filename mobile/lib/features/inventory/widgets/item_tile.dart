import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/item.dart';

class ItemTile extends StatelessWidget {
  final Item item;
  final VoidCallback? onTap;

  const ItemTile({super.key, required this.item, this.onTap});

  @override
  Widget build(BuildContext context) {
    final statusColor =
        AppTheme.stockStatusColor(item.currentStock, item.minimumThreshold);
    final theme = Theme.of(context);

    return Card(
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: item.category?.color != null
                ? AppTheme.fromHex(item.category!.color).withValues(alpha: 0.15)
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              item.name.isNotEmpty ? item.name[0].toUpperCase() : '?',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: item.category?.color != null
                    ? AppTheme.fromHex(item.category!.color)
                    : theme.colorScheme.onSurface,
              ),
            ),
          ),
        ),
        title: Text(item.name),
        subtitle: Text(
          '${item.currentStock} ${item.unit}${item.category != null ? ' \u2022 ${item.category!.name}' : ''}',
          style: theme.textTheme.bodySmall,
        ),
        trailing: Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: item.trackStock ? statusColor : Colors.grey,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}
