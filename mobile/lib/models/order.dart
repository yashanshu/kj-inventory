import 'dart:convert';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order.freezed.dart';
part 'order.g.dart';

@freezed
class ExternalOrder with _$ExternalOrder {
  const ExternalOrder._();

  const factory ExternalOrder({
    required int id,
    required String platform,
    required String externalOrderId,
    required String orderDate,
    String? customerName,
    required double totalAmount,
    required String status,
    String? itemsJson,
    String? notifiedAt,
    required String createdAt,
  }) = _ExternalOrder;

  factory ExternalOrder.fromJson(Map<String, dynamic> json) =>
      _$ExternalOrderFromJson(json);

  List<OrderItem> get parsedItems {
    if (itemsJson == null || itemsJson!.isEmpty) return [];
    try {
      final list = jsonDecode(itemsJson!) as List;
      return list.map((e) => OrderItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}

@freezed
class OrderItem with _$OrderItem {
  const factory OrderItem({
    required String name,
    required int quantity,
    required double price,
  }) = _OrderItem;

  factory OrderItem.fromJson(Map<String, dynamic> json) =>
      _$OrderItemFromJson(json);
}

@freezed
class OrderStats with _$OrderStats {
  const factory OrderStats({
    required int totalOrders,
    required double totalRevenue,
    required Map<String, PlatformStats> platformBreakdown,
  }) = _OrderStats;

  factory OrderStats.fromJson(Map<String, dynamic> json) =>
      _$OrderStatsFromJson(json);
}

@freezed
class PlatformStats with _$PlatformStats {
  const factory PlatformStats({
    required int count,
    required double revenue,
  }) = _PlatformStats;

  factory PlatformStats.fromJson(Map<String, dynamic> json) =>
      _$PlatformStatsFromJson(json);
}
