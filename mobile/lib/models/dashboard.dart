import 'package:freezed_annotation/freezed_annotation.dart';

part 'dashboard.freezed.dart';
part 'dashboard.g.dart';

@freezed
class DashboardMetrics with _$DashboardMetrics {
  const factory DashboardMetrics({
    required int totalItems,
    required int lowStockCount,
    required int outOfStockCount,
    required double totalValue,
    required int recentMovements,
  }) = _DashboardMetrics;

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) =>
      _$DashboardMetricsFromJson(json);
}

@freezed
class StockTrend with _$StockTrend {
  const factory StockTrend({
    required String date,
    @JsonKey(name: 'in') required int stockIn,
    @JsonKey(name: 'out') required int stockOut,
    required int adjustments,
  }) = _StockTrend;

  factory StockTrend.fromJson(Map<String, dynamic> json) =>
      _$StockTrendFromJson(json);
}

@freezed
class CategoryBreakdown with _$CategoryBreakdown {
  const factory CategoryBreakdown({
    required String categoryId,
    required String categoryName,
    required int itemCount,
    required double totalValue,
    String? color,
  }) = _CategoryBreakdown;

  factory CategoryBreakdown.fromJson(Map<String, dynamic> json) =>
      _$CategoryBreakdownFromJson(json);
}
