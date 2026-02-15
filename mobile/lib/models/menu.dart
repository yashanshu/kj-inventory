import 'dart:convert';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'menu.freezed.dart';
part 'menu.g.dart';

@freezed
class RestaurantMenu with _$RestaurantMenu {
  const RestaurantMenu._();

  const factory RestaurantMenu({
    required int id,
    required String restaurantId,
    required String restaurantName,
    String? offersJson,
    String? categoriesJson,
    required String fetchedAt,
    required String createdAt,
  }) = _RestaurantMenu;

  factory RestaurantMenu.fromJson(Map<String, dynamic> json) =>
      _$RestaurantMenuFromJson(json);

  List<MenuOffer> get parsedOffers {
    if (offersJson == null || offersJson!.isEmpty) return [];
    try {
      final list = jsonDecode(offersJson!) as List;
      return list.map((e) => MenuOffer.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  List<MenuCategory> get parsedCategories {
    if (categoriesJson == null || categoriesJson!.isEmpty) return [];
    try {
      final list = jsonDecode(categoriesJson!) as List;
      return list.map((e) => MenuCategory.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}

@freezed
class MenuOffer with _$MenuOffer {
  const factory MenuOffer({
    required String title,
    String? description,
  }) = _MenuOffer;

  factory MenuOffer.fromJson(Map<String, dynamic> json) =>
      _$MenuOfferFromJson(json);
}

@freezed
class MenuCategory with _$MenuCategory {
  const factory MenuCategory({
    required String name,
    @Default([]) List<MenuItem> items,
  }) = _MenuCategory;

  factory MenuCategory.fromJson(Map<String, dynamic> json) =>
      _$MenuCategoryFromJson(json);
}

@freezed
class MenuItem with _$MenuItem {
  const factory MenuItem({
    required String name,
    double? price,
    String? description,
    bool? isAvailable,
  }) = _MenuItem;

  factory MenuItem.fromJson(Map<String, dynamic> json) =>
      _$MenuItemFromJson(json);
}
