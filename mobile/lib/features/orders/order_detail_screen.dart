import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/order_provider.dart';

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(orderProvider);
    final order = state.orders
        .where((o) => o.id.toString() == orderId)
        .firstOrNull;
    final theme = Theme.of(context);

    if (order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Details')),
        body: const Center(child: Text('Order not found')),
      );
    }

    final items = order.parsedItems;

    return Scaffold(
      appBar: AppBar(title: Text('Order #${order.externalOrderId}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _row('Platform', order.platform.toUpperCase()),
                  _row('Status', order.status),
                  _row('Customer', order.customerName ?? 'Unknown'),
                  _row('Order Date', order.orderDate),
                  _row('Total',
                      '\u20B9${order.totalAmount.toStringAsFixed(2)}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Items', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          if (items.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('No item details available'),
              ),
            )
          else
            ...items.map((item) => Card(
                  child: ListTile(
                    title: Text(item.name),
                    subtitle: Text('Qty: ${item.quantity}'),
                    trailing: Text(
                      '\u20B9${item.price.toStringAsFixed(0)}',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                )),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
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
}
