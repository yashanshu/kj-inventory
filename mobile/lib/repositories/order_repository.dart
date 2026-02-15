import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/order.dart';

class OrderRepository {
  final ApiClient _client;

  OrderRepository({required ApiClient client}) : _client = client;

  Future<List<ExternalOrder>> getOrders({
    String? platform,
    int limit = 50,
    int offset = 0,
  }) async {
    final params = <String, dynamic>{
      'limit': limit,
      'offset': offset,
    };
    if (platform != null && platform.isNotEmpty) {
      params['platform'] = platform;
    }

    return _client.get(
      ApiConstants.orders,
      (json) => (json as List)
          .map((e) => ExternalOrder.fromJson(e as Map<String, dynamic>))
          .toList(),
      queryParameters: params,
    );
  }

  Future<OrderStats> getStats() async {
    return _client.get(
      ApiConstants.orderStats,
      (json) => OrderStats.fromJson(json as Map<String, dynamic>),
    );
  }
}
