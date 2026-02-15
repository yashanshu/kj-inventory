import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/movement.dart';

class MovementRepository {
  final ApiClient _client;

  MovementRepository({required ApiClient client}) : _client = client;

  Future<StockMovement> createMovement(CreateMovementRequest request) async {
    return _client.post(
      ApiConstants.movements,
      (json) => StockMovement.fromJson(json as Map<String, dynamic>),
      data: request.toJson(),
    );
  }

  Future<List<StockMovement>> getMovements({
    String? itemId,
    int limit = 50,
    int offset = 0,
  }) async {
    final params = <String, dynamic>{
      'limit': limit,
      'offset': offset,
    };
    if (itemId != null) params['itemId'] = itemId;

    return _client.get(
      ApiConstants.movements,
      (json) => (json as List)
          .map((e) => StockMovement.fromJson(e as Map<String, dynamic>))
          .toList(),
      queryParameters: params,
    );
  }

  Future<List<StockMovement>> getItemMovements(
    String itemId, {
    int limit = 50,
    int offset = 0,
  }) async {
    return _client.get(
      '${ApiConstants.items}/$itemId/movements',
      (json) => (json as List)
          .map((e) => StockMovement.fromJson(e as Map<String, dynamic>))
          .toList(),
      queryParameters: {'limit': limit, 'offset': offset},
    );
  }
}
