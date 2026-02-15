import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiException implements Exception {
  final String code;
  final String message;
  final dynamic details;

  const ApiException({
    required this.code,
    required this.message,
    this.details,
  });

  @override
  String toString() => 'ApiException($code): $message';
}

class ApiClient {
  final Dio _dio;
  final SecureStorage _storage;
  void Function()? onUnauthorized;

  ApiClient({
    required SecureStorage storage,
    Dio? dio,
  })  : _storage = storage,
        _dio = dio ?? Dio() {
    _dio.options.baseUrl = ApiConstants.baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: _onRequest,
      onError: _onError,
    ));
  }

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    if (error.response?.statusCode == 401) {
      await _storage.clearToken();
      onUnauthorized?.call();
    }
    handler.next(error);
  }

  /// Unwrap the `{"data": ...}` envelope from API responses.
  T _unwrap<T>(Response response, T Function(dynamic json) fromJson) {
    final body = response.data;
    if (body is Map<String, dynamic> && body.containsKey('data')) {
      return fromJson(body['data']);
    }
    return fromJson(body);
  }

  /// Parse API error responses into [ApiException].
  Never _throwApiError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic> && data.containsKey('error')) {
      final err = data['error'] as Map<String, dynamic>;
      throw ApiException(
        code: err['code'] as String? ?? 'UNKNOWN',
        message: err['message'] as String? ?? 'Unknown error',
        details: err['details'],
      );
    }
    throw ApiException(
      code: 'NETWORK_ERROR',
      message: e.message ?? 'Network error',
    );
  }

  Future<T> get<T>(
    String path,
    T Function(dynamic json) fromJson, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
      );
      return _unwrap(response, fromJson);
    } on DioException catch (e) {
      _throwApiError(e);
    }
  }

  Future<T> post<T>(
    String path,
    T Function(dynamic json) fromJson, {
    dynamic data,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      return _unwrap(response, fromJson);
    } on DioException catch (e) {
      _throwApiError(e);
    }
  }

  Future<T> put<T>(
    String path,
    T Function(dynamic json) fromJson, {
    dynamic data,
  }) async {
    try {
      final response = await _dio.put(path, data: data);
      return _unwrap(response, fromJson);
    } on DioException catch (e) {
      _throwApiError(e);
    }
  }

  Future<void> delete(String path, {dynamic data}) async {
    try {
      await _dio.delete(path, data: data);
    } on DioException catch (e) {
      _throwApiError(e);
    }
  }

  /// Raw GET that returns the full unwrapped data (for endpoints returning
  /// non-standard shapes like paginated responses).
  Future<Map<String, dynamic>> getRaw(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
      );
      final body = response.data;
      if (body is Map<String, dynamic> && body.containsKey('data')) {
        return body['data'] as Map<String, dynamic>;
      }
      return body as Map<String, dynamic>;
    } on DioException catch (e) {
      _throwApiError(e);
    }
  }
}
