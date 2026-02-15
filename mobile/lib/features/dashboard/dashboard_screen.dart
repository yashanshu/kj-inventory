import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/dashboard_provider.dart';
import '../../core/theme/app_theme.dart';
import 'widgets/metric_card.dart';
import 'widgets/stock_trend_chart.dart';
import 'widgets/category_pie_chart.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);

    return dashboardAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Failed to load dashboard',
                style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: () => ref.invalidate(dashboardProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Metric cards
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: 'Total Items',
                    value: '${data.metrics.totalItems}',
                    icon: Icons.inventory_2_outlined,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: 'Low Stock',
                    value: '${data.metrics.lowStockCount}',
                    icon: Icons.warning_amber_outlined,
                    color: AppTheme.warningColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: 'Out of Stock',
                    value: '${data.metrics.outOfStockCount}',
                    icon: Icons.error_outline,
                    color: AppTheme.errorColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: 'Movements (7d)',
                    value: '${data.metrics.recentMovements}',
                    icon: Icons.swap_vert_outlined,
                    color: AppTheme.successColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Stock trends chart
            if (data.stockTrends.isNotEmpty) ...[
              Text('Stock Movements (7 Days)',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              SizedBox(
                height: 200,
                child: StockTrendChart(trends: data.stockTrends),
              ),
              const SizedBox(height: 24),
            ],

            // Category breakdown
            if (data.categoryBreakdown.isNotEmpty) ...[
              Text('Items by Category',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              SizedBox(
                height: 200,
                child: CategoryPieChart(breakdown: data.categoryBreakdown),
              ),
              const SizedBox(height: 24),
            ],

            // Low stock items
            if (data.lowStockItems.isNotEmpty) ...[
              Text('Low Stock Items',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...data.lowStockItems.map((item) => Card(
                    child: ListTile(
                      title: Text(item.name),
                      subtitle: Text(
                          '${item.currentStock} ${item.unit} / min: ${item.minimumThreshold} ${item.unit}'),
                      trailing: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: AppTheme.stockStatusColor(
                              item.currentStock, item.minimumThreshold),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  )),
              const SizedBox(height: 24),
            ],

            // Recent alerts
            if (data.alerts.isNotEmpty) ...[
              Text('Recent Alerts',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...data.alerts.take(5).map((alert) => Card(
                    child: ListTile(
                      leading: Icon(
                        alert.isRead
                            ? Icons.check_circle_outline
                            : Icons.warning_amber,
                        color: alert.isRead ? Colors.grey : AppTheme.warningColor,
                      ),
                      title: Text(
                        alert.title,
                        style: TextStyle(
                          fontWeight:
                              alert.isRead ? FontWeight.normal : FontWeight.bold,
                        ),
                      ),
                      subtitle: Text(alert.message),
                    ),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}
