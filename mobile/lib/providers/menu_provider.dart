import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/menu.dart';
import 'providers.dart';

final menusProvider = FutureProvider<List<RestaurantMenu>>((ref) async {
  final repo = ref.watch(menuRepositoryProvider);
  return repo.getMenus();
});

final menuDetailProvider =
    FutureProvider.family<RestaurantMenu, String>((ref, restaurantId) async {
  final repo = ref.watch(menuRepositoryProvider);
  return repo.getMenu(restaurantId);
});
