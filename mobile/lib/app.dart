import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/inventory/items_screen.dart';
import 'features/inventory/item_detail_screen.dart';
import 'features/inventory/item_form_screen.dart';
import 'features/movements/add_movement_screen.dart';
import 'features/orders/orders_screen.dart';
import 'features/orders/order_detail_screen.dart';
import 'features/menu/menu_screen.dart';
import 'features/menu/menu_detail_screen.dart';
import 'features/alerts/alerts_screen.dart';
import 'features/settings/settings_screen.dart';
import 'widgets/app_scaffold.dart';

final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final isLoginRoute = state.matchedLocation == '/login';

      // Still loading auth state
      if (isLoading) return null;

      if (!isLoggedIn && !isLoginRoute) return '/login';
      if (isLoggedIn && isLoginRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => AppScaffold(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (_, __) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/inventory',
            builder: (_, __) => const ItemsScreen(),
            routes: [
              GoRoute(
                path: 'new',
                builder: (_, __) => const ItemFormScreen(),
              ),
              GoRoute(
                path: ':id',
                builder: (_, state) => ItemDetailScreen(
                  itemId: state.pathParameters['id']!,
                ),
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (_, state) => ItemFormScreen(
                      itemId: state.pathParameters['id'],
                    ),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: '/orders',
            builder: (_, __) => const OrdersScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => OrderDetailScreen(
                  orderId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/menu',
            builder: (_, __) => const MenuScreen(),
            routes: [
              GoRoute(
                path: ':restaurantId',
                builder: (_, state) => MenuDetailScreen(
                  restaurantId: state.pathParameters['restaurantId']!,
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/alerts',
        builder: (_, __) => const AlertsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (_, __) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/movements/add',
        builder: (_, state) => AddMovementScreen(
          itemId: state.uri.queryParameters['itemId'],
        ),
      ),
    ],
  );
});

class KJInventoryApp extends ConsumerWidget {
  const KJInventoryApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'KJ Inventory',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
