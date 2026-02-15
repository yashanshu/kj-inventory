import 'package:flutter_test/flutter_test.dart';
import 'package:kj_inventory/models/user.dart';

void main() {
  group('User', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'user-123',
        'organizationId': 'org-456',
        'email': 'test@example.com',
        'firstName': 'John',
        'lastName': 'Doe',
        'role': 'ADMIN',
        'isActive': true,
        'createdAt': '2024-01-15T10:30:00Z',
        'updatedAt': '2024-01-15T10:30:00Z',
      };

      final user = User.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.email, 'test@example.com');
      expect(user.role, Role.admin);
      expect(user.isActive, true);
    });

    test('toJson round-trips correctly', () {
      const user = User(
        id: 'user-123',
        organizationId: 'org-456',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.manager,
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      );

      final json = user.toJson();
      final restored = User.fromJson(json);

      expect(restored, user);
      expect(json['role'], 'MANAGER');
    });
  });

  group('AuthResponse', () {
    test('fromJson parses correctly', () {
      final json = {
        'token': 'jwt-token-here',
        'user': {
          'id': 'user-123',
          'organizationId': 'org-456',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': 'Doe',
          'role': 'USER',
          'isActive': true,
          'createdAt': '2024-01-15T10:30:00Z',
          'updatedAt': '2024-01-15T10:30:00Z',
        },
      };

      final response = AuthResponse.fromJson(json);

      expect(response.token, 'jwt-token-here');
      expect(response.user.email, 'test@example.com');
      expect(response.user.role, Role.user);
    });
  });

  group('LoginRequest', () {
    test('toJson produces correct output', () {
      const request = LoginRequest(
        email: 'test@example.com',
        password: 'secret123',
      );

      final json = request.toJson();

      expect(json['email'], 'test@example.com');
      expect(json['password'], 'secret123');
    });
  });
}
