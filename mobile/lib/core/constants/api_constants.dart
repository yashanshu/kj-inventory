class ApiConstants {
  ApiConstants._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8888/api/v1',
  );

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String profile = '/auth/profile';
  static const String changePassword = '/auth/change-password';

  // Categories
  static const String categories = '/categories';

  // Items
  static const String items = '/items';

  // Movements
  static const String movements = '/movements';

  // Dashboard
  static const String dashboardMetrics = '/dashboard/metrics';
  static const String dashboardRecentMovements = '/dashboard/recent-movements';
  static const String dashboardStockTrends = '/dashboard/stock-trends';
  static const String dashboardCategoryBreakdown = '/dashboard/category-breakdown';
  static const String dashboardLowStock = '/dashboard/low-stock';
  static const String dashboardAlerts = '/dashboard/alerts';

  // Orders
  static const String orders = '/orders';
  static const String orderStats = '/orders/stats';

  // Menu
  static const String menu = '/menu';
}
