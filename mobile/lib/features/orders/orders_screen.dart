import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/order_provider.dart';
import 'widgets/order_stats_card.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  static const _platforms = [null, 'swiggy', 'zomato'];
  static const _labels = ['All', 'Swiggy', 'Zomato'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        ref
            .read(orderProvider.notifier)
            .setPlatformFilter(_platforms[_tabController.index]);
      }
    });
    Future.microtask(() {
      ref.read(orderProvider.notifier).fetchOrders();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(orderProvider);
    final theme = Theme.of(context);

    return Column(
      children: [
        const OrderStatsCard(),
        TabBar(
          controller: _tabController,
          tabs: _labels.map((l) => Tab(text: l)).toList(),
        ),
        Expanded(
          child: state.isLoading && state.orders.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : state.error != null && state.orders.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Failed to load orders'),
                          const SizedBox(height: 8),
                          FilledButton.tonal(
                            onPressed: () =>
                                ref.read(orderProvider.notifier).refresh(),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    )
                  : state.orders.isEmpty
                      ? const Center(child: Text('No orders found'))
                      : RefreshIndicator(
                          onRefresh: () =>
                              ref.read(orderProvider.notifier).refresh(),
                          child: ListView.builder(
                            padding: const EdgeInsets.all(12),
                            itemCount: state.orders.length,
                            itemBuilder: (context, index) {
                              final order = state.orders[index];
                              return Card(
                                child: ListTile(
                                  onTap: () =>
                                      context.push('/orders/${order.id}'),
                                  leading: CircleAvatar(
                                    backgroundColor: order.platform == 'swiggy'
                                        ? Colors.orange.shade100
                                        : Colors.red.shade100,
                                    child: Text(
                                      order.platform[0].toUpperCase(),
                                      style: TextStyle(
                                        color: order.platform == 'swiggy'
                                            ? Colors.orange.shade800
                                            : Colors.red.shade800,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  title: Text(
                                    '#${order.externalOrderId}',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${order.customerName ?? 'Unknown'} \u2022 ${order.parsedItems.length} items',
                                  ),
                                  trailing: Text(
                                    '\u20B9${order.totalAmount.toStringAsFixed(0)}',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}
