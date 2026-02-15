import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/item.dart';
import 'package:kj_inventory/models/category.dart';

void main() {
  group('Item', () {
    test('fromJson parses correctly with category', () {
      final json = {
        'id': 'item-123',
        'organizationId': 'org-456',
        'categoryId': 'cat-789',
        'name': 'Basmati Rice',
        'sku': 'RICE-001',
        'unit': 'kg',
        'minimumThreshold': 5.0,
        'currentStock': 25.5,
        'unitCost': 120.0,
        'isActive': true,
        'trackStock': true,
        'createdAt': '2024-01-15T10:30:00Z',
        'updatedAt': '2024-01-15T10:30:00Z',
        'category': {
          'id': 'cat-789',
          'organizationId': 'org-456',
          'name': 'Dry Items',
          'description': 'Dry goods',
          'color': '#FF5733',
          'createdAt': '2024-01-15T10:30:00Z',
          'updatedAt': '2024-01-15T10:30:00Z',
        },
      };

      final item = Item.fromJson(json);

      expect(item.id, 'item-123');
      expect(item.name, 'Basmati Rice');
      expect(item.sku, 'RICE-001');
      expect(item.unit, 'kg');
      expect(item.minimumThreshold, 5.0);
      expect(item.currentStock, 25.5);
      expect(item.unitCost, 120.0);
      expect(item.trackStock, true);
      expect(item.category, isNotNull);
      expect(item.category!.name, 'Dry Items');
      expect(item.category!.color, '#FF5733');
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'item-123',
        'organizationId': 'org-456',
        'categoryId': 'cat-789',
        'name': 'Salt',
        'unit': 'pcs',
        'minimumThreshold': 10.0,
        'currentStock': 0.0,
        'isActive': true,
        'trackStock': false,
        'createdAt': '2024-01-15T10:30:00Z',
        'updatedAt': '2024-01-15T10:30:00Z',
      };

      final item = Item.fromJson(json);

      expect(item.sku, isNull);
      expect(item.unitCost, isNull);
      expect(item.category, isNull);
    });

    test('toJson round-trips correctly', () {
      const item = Item(
        id: 'item-123',
        organizationId: 'org-456',
        categoryId: 'cat-789',
        name: 'Oil',
        unit: 'ltr',
        minimumThreshold: 2.0,
        currentStock: 10.0,
        isActive: true,
        trackStock: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      );

      final json = item.toJson();
      final restored = Item.fromJson(json);

      expect(restored, item);
    });
  });

  group('PaginatedItems', () {
    test('fromJson parses correctly', () {
      final json = {
        'items': [
          {
            'id': 'item-1',
            'organizationId': 'org-1',
            'categoryId': 'cat-1',
            'name': 'Item 1',
            'unit': 'pcs',
            'minimumThreshold': 5.0,
            'currentStock': 10.0,
            'isActive': true,
            'trackStock': true,
            'createdAt': '2024-01-15T10:30:00Z',
            'updatedAt': '2024-01-15T10:30:00Z',
          },
        ],
        'total': 42,
      };

      final result = PaginatedItems.fromJson(json);

      expect(result.items.length, 1);
      expect(result.total, 42);
      expect(result.items[0].name, 'Item 1');
    });
  });

  group('CreateItemRequest', () {
    test('toJson produces correct output', () {
      const request = CreateItemRequest(
        categoryId: 'cat-1',
        name: 'New Item',
        unit: 'kg',
        minimumThreshold: 5.0,
        currentStock: 20.0,
        unitCost: 100.0,
        trackStock: true,
      );

      final json = request.toJson();

      expect(json['categoryId'], 'cat-1');
      expect(json['name'], 'New Item');
      expect(json['unit'], 'kg');
      expect(json['minimumThreshold'], 5.0);
      expect(json['currentStock'], 20.0);
      expect(json['unitCost'], 100.0);
      expect(json['trackStock'], true);
    });
  });
}
