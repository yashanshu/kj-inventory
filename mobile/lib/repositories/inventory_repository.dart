import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/item.dart';
import '../models/category.dart';

class InventoryRepository {
  final ApiClient _client;

  InventoryRepository({required ApiClient client}) : _client = client;

  // Items

  Future<PaginatedItems> getItems({
    String? search,
    String? categoryId,
    bool? lowStock,
    int limit = 50,
    int offset = 0,
  }) async {
    final params = <String, dynamic>{
      'limit': limit,
      'offset': offset,
    };
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (categoryId != null && categoryId.isNotEmpty) {
      params['categoryId'] = categoryId;
    }
    if (lowStock == true) params['lowStock'] = true;

    return _client.get(
      ApiConstants.items,
      (json) => PaginatedItems.fromJson(json as Map<String, dynamic>),
      queryParameters: params,
    );
  }

  Future<Item> getItem(String id) async {
    return _client.get(
      '${ApiConstants.items}/$id',
      (json) => Item.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<Item> createItem(CreateItemRequest request) async {
    return _client.post(
      ApiConstants.items,
      (json) => Item.fromJson(json as Map<String, dynamic>),
      data: request.toJson(),
    );
  }

  Future<Item> updateItem(String id, UpdateItemRequest request) async {
    return _client.put(
      '${ApiConstants.items}/$id',
      (json) => Item.fromJson(json as Map<String, dynamic>),
      data: request.toJson(),
    );
  }

  Future<void> deleteItem(String id) async {
    await _client.delete('${ApiConstants.items}/$id');
  }

  // Categories

  Future<List<Category>> getCategories() async {
    return _client.get(
      ApiConstants.categories,
      (json) => (json as List)
          .map((e) => Category.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<Category> createCategory(CreateCategoryRequest request) async {
    return _client.post(
      ApiConstants.categories,
      (json) => Category.fromJson(json as Map<String, dynamic>),
      data: request.toJson(),
    );
  }

  Future<Category> updateCategory(
      String id, UpdateCategoryRequest request) async {
    return _client.put(
      '${ApiConstants.categories}/$id',
      (json) => Category.fromJson(json as Map<String, dynamic>),
      data: request.toJson(),
    );
  }

  Future<void> deleteCategory(String id, {String? targetCategoryId}) async {
    await _client.delete(
      '${ApiConstants.categories}/$id',
      data: targetCategoryId != null
          ? {'targetCategoryId': targetCategoryId}
          : null,
    );
  }
}
