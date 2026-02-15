import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/menu.dart';

void main() {
  group('RestaurantMenu', () {
    test('parsedOffers parses offersJson correctly', () {
      final json = {
        'id': 1,
        'restaurantId': 'rest-001',
        'restaurantName': 'Test Restaurant',
        'offersJson':
            '[{"title":"60% off","description":"On first order"},{"title":"Free delivery"}]',
        'categoriesJson': '[]',
        'fetchedAt': '2024-01-15T18:00:00Z',
        'createdAt': '2024-01-15T18:00:00Z',
      };

      final menu = RestaurantMenu.fromJson(json);
      final offers = menu.parsedOffers;

      expect(offers.length, 2);
      expect(offers[0].title, '60% off');
      expect(offers[0].description, 'On first order');
      expect(offers[1].title, 'Free delivery');
      expect(offers[1].description, isNull);
    });

    test('parsedCategories parses categoriesJson correctly', () {
      final json = {
        'id': 1,
        'restaurantId': 'rest-001',
        'restaurantName': 'Test Restaurant',
        'offersJson': '[]',
        'categoriesJson':
            '[{"name":"Biryani","items":[{"name":"Chicken Biryani","price":299},{"name":"Veg Biryani","price":199}]},{"name":"Starters","items":[]}]',
        'fetchedAt': '2024-01-15T18:00:00Z',
        'createdAt': '2024-01-15T18:00:00Z',
      };

      final menu = RestaurantMenu.fromJson(json);
      final categories = menu.parsedCategories;

      expect(categories.length, 2);
      expect(categories[0].name, 'Biryani');
      expect(categories[0].items.length, 2);
      expect(categories[0].items[0].name, 'Chicken Biryani');
      expect(categories[0].items[0].price, 299.0);
      expect(categories[1].name, 'Starters');
      expect(categories[1].items, isEmpty);
    });

    test('parsedOffers returns empty for null offersJson', () {
      final json = {
        'id': 2,
        'restaurantId': 'rest-002',
        'restaurantName': 'Another Restaurant',
        'fetchedAt': '2024-01-15T18:00:00Z',
        'createdAt': '2024-01-15T18:00:00Z',
      };

      final menu = RestaurantMenu.fromJson(json);

      expect(menu.parsedOffers, isEmpty);
      expect(menu.parsedCategories, isEmpty);
    });

    test('handles malformed JSON gracefully', () {
      final json = {
        'id': 3,
        'restaurantId': 'rest-003',
        'restaurantName': 'Bad Data Restaurant',
        'offersJson': 'not json',
        'categoriesJson': '{invalid}',
        'fetchedAt': '2024-01-15T18:00:00Z',
        'createdAt': '2024-01-15T18:00:00Z',
      };

      final menu = RestaurantMenu.fromJson(json);

      expect(menu.parsedOffers, isEmpty);
      expect(menu.parsedCategories, isEmpty);
    });
  });
}
