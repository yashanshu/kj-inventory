import 'package:freezed_annotation/freezed_annotation.dart';
import 'category.dart';

part 'item.freezed.dart';
part 'item.g.dart';

@freezed
class Item with _$Item {
  const factory Item({
    required String id,
    required String organizationId,
    required String categoryId,
    required String name,
    String? sku,
    required String unit,
    required double minimumThreshold,
    required double currentStock,
    double? unitCost,
    required bool isActive,
    required bool trackStock,
    required String createdAt,
    required String updatedAt,
    Category? category,
  }) = _Item;

  factory Item.fromJson(Map<String, dynamic> json) => _$ItemFromJson(json);
}

@freezed
class PaginatedItems with _$PaginatedItems {
  const factory PaginatedItems({
    required List<Item> items,
    required int total,
  }) = _PaginatedItems;

  factory PaginatedItems.fromJson(Map<String, dynamic> json) =>
      _$PaginatedItemsFromJson(json);
}

@freezed
class CreateItemRequest with _$CreateItemRequest {
  const factory CreateItemRequest({
    required String categoryId,
    required String name,
    String? sku,
    required String unit,
    required double minimumThreshold,
    required double currentStock,
    double? unitCost,
    bool? trackStock,
  }) = _CreateItemRequest;

  factory CreateItemRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateItemRequestFromJson(json);
}

@freezed
class UpdateItemRequest with _$UpdateItemRequest {
  const factory UpdateItemRequest({
    String? categoryId,
    String? name,
    String? sku,
    String? unit,
    double? minimumThreshold,
    double? unitCost,
    bool? isActive,
    bool? trackStock,
  }) = _UpdateItemRequest;

  factory UpdateItemRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateItemRequestFromJson(json);
}
