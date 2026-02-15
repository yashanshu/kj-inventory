import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../core/storage/secure_storage.dart';
import '../models/user.dart';

class AuthRepository {
  final ApiClient _client;
  final SecureStorage _storage;

  AuthRepository({
    required ApiClient client,
    required SecureStorage storage,
  })  : _client = client,
        _storage = storage;

  Future<AuthResponse> login(LoginRequest request) async {
    final response = await _client.post(
      ApiConstants.login,
      (json) => AuthResponse.fromJson(json as Map<String, dynamic>),
      data: request.toJson(),
    );
    await _storage.setToken(response.token);
    return response;
  }

  Future<User> getProfile() async {
    return _client.get(
      ApiConstants.profile,
      (json) => User.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> changePassword(ChangePasswordRequest request) async {
    await _client.post(
      ApiConstants.changePassword,
      (_) => null,
      data: request.toJson(),
    );
  }

  Future<void> logout() async {
    await _storage.clearToken();
  }

  Future<String?> getSavedToken() => _storage.getToken();
}
