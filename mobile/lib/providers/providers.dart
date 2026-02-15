import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_client.dart';
import '../core/storage/secure_storage.dart';
import '../repositories/auth_repository.dart';
import '../repositories/inventory_repository.dart';
import '../repositories/movement_repository.dart';
import '../repositories/dashboard_repository.dart';
import '../repositories/order_repository.dart';
import '../repositories/menu_repository.dart';

// Core
final secureStorageProvider = Provider<SecureStorage>(
  (ref) => SecureStorage(),
);

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storage: storage);
});

// Repositories
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    client: ref.watch(apiClientProvider),
    storage: ref.watch(secureStorageProvider),
  );
});

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  return InventoryRepository(client: ref.watch(apiClientProvider));
});

final movementRepositoryProvider = Provider<MovementRepository>((ref) {
  return MovementRepository(client: ref.watch(apiClientProvider));
});

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(client: ref.watch(apiClientProvider));
});

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepository(client: ref.watch(apiClientProvider));
});

final menuRepositoryProvider = Provider<MenuRepository>((ref) {
  return MenuRepository(client: ref.watch(apiClientProvider));
});
