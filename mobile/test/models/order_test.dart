import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/order.dart';

void main() {
  group('ExternalOrder', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 123,
        'platform': 'swiggy',
        'externalOrderId': 'SWG-2024-001',
        'orderDate': '2024-01-15T18:30:00Z',
        'customerName': 'John Doe',
        'totalAmount': 450.50,
        'status': 'delivered',
        'itemsJson':
            '[{"name":"Biryani","quantity":1,"price":300},{"name":"Naan","quantity":2,"price":75}]',
        'createdAt': '2024-01-15T18:30:00Z',
      };

      final order = ExternalOrder.fromJson(json);

      expect(order.id, 123);
      expect(order.platform, 'swiggy');
      expect(order.totalAmount, 450.50);
      expect(order.customerName, 'John Doe');
    });

    test('parsedItems parses itemsJson correctly', () {
      final json = {
        'id': 123,
        'platform': 'swiggy',
        'externalOrderId': 'SWG-2024-001',
        'orderDate': '2024-01-15T18:30:00Z',
        'totalAmount': 450.50,
        'status': 'delivered',
        'itemsJson':
            '[{"name":"Biryani","quantity":1,"price":300},{"name":"Naan","quantity":2,"price":75}]',
        'createdAt': '2024-01-15T18:30:00Z',
      };

      final order = ExternalOrder.fromJson(json);
      final items = order.parsedItems;

      expect(items.length, 2);
      expect(items[0].name, 'Biryani');
      expect(items[0].quantity, 1);
      expect(items[0].price, 300.0);
      expect(items[1].name, 'Naan');
      expect(items[1].quantity, 2);
    });

    test('parsedItems returns empty list for null itemsJson', () {
      final json = {
        'id': 124,
        'platform': 'zomato',
        'externalOrderId': 'ZMT-2024-001',
        'orderDate': '2024-01-15T18:30:00Z',
        'totalAmount': 200.0,
        'status': 'new',
        'createdAt': '2024-01-15T18:30:00Z',
      };

      final order = ExternalOrder.fromJson(json);

      expect(order.parsedItems, isEmpty);
    });

    test('parsedItems handles malformed JSON gracefully', () {
      final json = {
        'id': 125,
        'platform': 'swiggy',
        'externalOrderId': 'SWG-2024-002',
        'orderDate': '2024-01-15T18:30:00Z',
        'totalAmount': 100.0,
        'status': 'delivered',
        'itemsJson': 'not valid json',
        'createdAt': '2024-01-15T18:30:00Z',
      };

      final order = ExternalOrder.fromJson(json);

      expect(order.parsedItems, isEmpty);
    });
  });

  group('OrderItem', () {
    test('fromJson parses correctly', () {
      final json = {
        'name': 'Butter Chicken',
        'quantity': 2,
        'price': 350.0,
      };

      final item = OrderItem.fromJson(json);

      expect(item.name, 'Butter Chicken');
      expect(item.quantity, 2);
      expect(item.price, 350.0);
    });
  });
}
