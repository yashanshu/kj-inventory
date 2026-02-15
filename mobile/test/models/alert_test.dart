import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/alert.dart';

void main() {
  group('Alert', () {
    test('fromJson parses LOW_STOCK alert', () {
      final json = {
        'id': 'alert-123',
        'organizationId': 'org-456',
        'itemId': 'item-789',
        'type': 'LOW_STOCK',
        'severity': 'WARNING',
        'title': 'Low Stock Alert',
        'message': 'Basmati Rice is below minimum threshold',
        'isRead': false,
        'createdAt': '2024-01-15T10:30:00Z',
      };

      final alert = Alert.fromJson(json);

      expect(alert.type, AlertType.lowStock);
      expect(alert.severity, AlertSeverity.warning);
      expect(alert.isRead, false);
      expect(alert.itemId, 'item-789');
    });

    test('fromJson parses OUT_OF_STOCK alert with CRITICAL severity', () {
      final json = {
        'id': 'alert-124',
        'organizationId': 'org-456',
        'itemId': 'item-790',
        'type': 'OUT_OF_STOCK',
        'severity': 'CRITICAL',
        'title': 'Out of Stock',
        'message': 'Salt is out of stock',
        'isRead': true,
        'createdAt': '2024-01-15T11:00:00Z',
      };

      final alert = Alert.fromJson(json);

      expect(alert.type, AlertType.outOfStock);
      expect(alert.severity, AlertSeverity.critical);
      expect(alert.isRead, true);
    });

    test('fromJson handles null itemId', () {
      final json = {
        'id': 'alert-125',
        'organizationId': 'org-456',
        'type': 'LOW_STOCK',
        'severity': 'INFO',
        'title': 'Test',
        'message': 'Test message',
        'isRead': false,
        'createdAt': '2024-01-15T12:00:00Z',
      };

      final alert = Alert.fromJson(json);

      expect(alert.itemId, isNull);
      expect(alert.item, isNull);
      expect(alert.severity, AlertSeverity.info);
    });
  });
}
