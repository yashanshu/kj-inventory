import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/dashboard.dart';

void main() {
  group('DashboardMetrics', () {
    test('fromJson parses correctly', () {
      final json = {
        'totalItems': 42,
        'lowStockCount': 3,
        'outOfStockCount': 1,
        'totalValue': 5250.75,
        'recentMovements': 15,
      };

      final metrics = DashboardMetrics.fromJson(json);

      expect(metrics.totalItems, 42);
      expect(metrics.lowStockCount, 3);
      expect(metrics.outOfStockCount, 1);
      expect(metrics.totalValue, 5250.75);
      expect(metrics.recentMovements, 15);
    });
  });

  group('StockTrend', () {
    test('fromJson parses "in" field correctly', () {
      final json = {
        'date': '2024-01-15',
        'in': 5,
        'out': 3,
        'adjustments': 1,
      };

      final trend = StockTrend.fromJson(json);

      expect(trend.date, '2024-01-15');
      expect(trend.stockIn, 5);
      expect(trend.stockOut, 3);
      expect(trend.adjustments, 1);
    });

    test('toJson uses "in" as key', () {
      const trend = StockTrend(
        date: '2024-01-15',
        stockIn: 5,
        stockOut: 3,
        adjustments: 1,
      );

      final json = trend.toJson();

      expect(json['in'], 5);
      expect(json['out'], 3);
    });
  });

  group('CategoryBreakdown', () {
    test('fromJson parses correctly with color', () {
      final json = {
        'categoryId': 'cat-1',
        'categoryName': 'Dry Items',
        'itemCount': 15,
        'totalValue': 2500.0,
        'color': '#FF5733',
      };

      final breakdown = CategoryBreakdown.fromJson(json);

      expect(breakdown.categoryName, 'Dry Items');
      expect(breakdown.itemCount, 15);
      expect(breakdown.totalValue, 2500.0);
      expect(breakdown.color, '#FF5733');
    });

    test('fromJson handles null color', () {
      final json = {
        'categoryId': 'cat-2',
        'categoryName': 'Packaging',
        'itemCount': 8,
        'totalValue': 500.0,
      };

      final breakdown = CategoryBreakdown.fromJson(json);

      expect(breakdown.color, isNull);
    });
  });
}
