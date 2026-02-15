import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/dashboard.dart';
import '../models/movement.dart';
import '../models/item.dart';
import '../models/alert.dart';

class DashboardRepository {
  final ApiClient _client;

  DashboardRepository({required ApiClient client}) : _client = client;

  Future<DashboardMetrics> getMetrics() async {
    return _client.get(
      ApiConstants.dashboardMetrics,
      (json) => DashboardMetrics.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<StockMovement>> getRecentMovements({int limit = 10}) async {
    return _client.get(
      ApiConstants.dashboardRecentMovements,
      (json) => (json as List)
          .map((e) => StockMovement.fromJson(e as Map<String, dynamic>))
          .toList(),
      queryParameters: {'limit': limit},
    );
  }

  Future<List<StockTrend>> getStockTrends({int days = 7}) async {
    return _client.get(
      ApiConstants.dashboardStockTrends,
      (json) => (json as List)
          .map((e) => StockTrend.fromJson(e as Map<String, dynamic>))
          .toList(),
      queryParameters: {'days': days},
    );
  }

  Future<List<CategoryBreakdown>> getCategoryBreakdown() async {
    return _client.get(
      ApiConstants.dashboardCategoryBreakdown,
      (json) => (json as List)
          .map((e) => CategoryBreakdown.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<List<Item>> getLowStockItems() async {
    return _client.get(
      ApiConstants.dashboardLowStock,
      (json) => (json as List)
          .map((e) => Item.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<List<Alert>> getAlerts() async {
    return _client.get(
      ApiConstants.dashboardAlerts,
      (json) => (json as List)
          .map((e) => Alert.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
