import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dashboard.dart';
import '../models/movement.dart';
import '../models/item.dart';
import '../models/alert.dart';
import 'providers.dart';

@immutable
class DashboardData {
  final DashboardMetrics metrics;
  final List<StockMovement> recentMovements;
  final List<StockTrend> stockTrends;
  final List<CategoryBreakdown> categoryBreakdown;
  final List<Item> lowStockItems;
  final List<Alert> alerts;

  const DashboardData({
    required this.metrics,
    required this.recentMovements,
    required this.stockTrends,
    required this.categoryBreakdown,
    required this.lowStockItems,
    required this.alerts,
  });

  int get unreadAlertCount => alerts.where((a) => !a.isRead).length;
}

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  final repo = ref.watch(dashboardRepositoryProvider);

  final results = await Future.wait([
    repo.getMetrics(),
    repo.getRecentMovements(),
    repo.getStockTrends(),
    repo.getCategoryBreakdown(),
    repo.getLowStockItems(),
    repo.getAlerts(),
  ]);

  return DashboardData(
    metrics: results[0] as DashboardMetrics,
    recentMovements: results[1] as List<StockMovement>,
    stockTrends: results[2] as List<StockTrend>,
    categoryBreakdown: results[3] as List<CategoryBreakdown>,
    lowStockItems: results[4] as List<Item>,
    alerts: results[5] as List<Alert>,
  );
});
