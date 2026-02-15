import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/menu.dart';

class MenuRepository {
  final ApiClient _client;

  MenuRepository({required ApiClient client}) : _client = client;

  Future<List<RestaurantMenu>> getMenus() async {
    return _client.get(
      ApiConstants.menu,
      (json) => (json as List)
          .map((e) => RestaurantMenu.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<RestaurantMenu> getMenu(String restaurantId) async {
    return _client.get(
      '${ApiConstants.menu}/$restaurantId',
      (json) => RestaurantMenu.fromJson(json as Map<String, dynamic>),
    );
  }
}
