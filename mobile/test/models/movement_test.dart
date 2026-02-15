import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/movement.dart';

void main() {
  group('StockMovement', () {
    test('fromJson parses IN movement', () {
      final json = {
        'id': 'mov-123',
        'itemId': 'item-456',
        'movementType': 'IN',
        'quantity': 10.0,
        'previousStock': 5.0,
        'newStock': 15.0,
        'reference': 'PO-001',
        'notes': 'Weekly restock',
        'createdBy': 'user-789',
        'createdAt': '2024-01-15T10:30:00Z',
      };

      final movement = StockMovement.fromJson(json);

      expect(movement.movementType, MovementType.stockIn);
      expect(movement.quantity, 10.0);
      expect(movement.previousStock, 5.0);
      expect(movement.newStock, 15.0);
      expect(movement.reference, 'PO-001');
    });

    test('fromJson parses OUT movement', () {
      final json = {
        'id': 'mov-124',
        'itemId': 'item-456',
        'movementType': 'OUT',
        'quantity': 3.0,
        'previousStock': 15.0,
        'newStock': 12.0,
        'createdBy': 'user-789',
        'createdAt': '2024-01-15T11:00:00Z',
      };

      final movement = StockMovement.fromJson(json);

      expect(movement.movementType, MovementType.stockOut);
      expect(movement.reference, isNull);
      expect(movement.notes, isNull);
    });

    test('fromJson parses ADJUSTMENT movement', () {
      final json = {
        'id': 'mov-125',
        'itemId': 'item-456',
        'movementType': 'ADJUSTMENT',
        'quantity': 2.0,
        'previousStock': 12.0,
        'newStock': 14.0,
        'notes': 'Inventory count correction',
        'createdBy': 'user-789',
        'createdAt': '2024-01-15T12:00:00Z',
      };

      final movement = StockMovement.fromJson(json);

      expect(movement.movementType, MovementType.adjustment);
    });
  });

  group('CreateMovementRequest', () {
    test('toJson produces correct output with IN type', () {
      const request = CreateMovementRequest(
        itemId: 'item-456',
        movementType: MovementType.stockIn,
        quantity: 10.0,
        notes: 'Restock',
      );

      final json = request.toJson();

      expect(json['itemId'], 'item-456');
      expect(json['movementType'], 'IN');
      expect(json['quantity'], 10.0);
      expect(json['notes'], 'Restock');
      expect(json['reference'], isNull);
    });
  });
}
