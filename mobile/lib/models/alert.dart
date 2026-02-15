import 'package:freezed_annotation/freezed_annotation.dart';
import 'item.dart';

part 'alert.freezed.dart';
part 'alert.g.dart';

enum AlertType {
  @JsonValue('LOW_STOCK')
  lowStock,
  @JsonValue('OUT_OF_STOCK')
  outOfStock,
}

enum AlertSeverity {
  @JsonValue('INFO')
  info,
  @JsonValue('WARNING')
  warning,
  @JsonValue('CRITICAL')
  critical,
}

@freezed
class Alert with _$Alert {
  const factory Alert({
    required String id,
    required String organizationId,
    String? itemId,
    required AlertType type,
    required AlertSeverity severity,
    required String title,
    required String message,
    required bool isRead,
    required String createdAt,
    Item? item,
  }) = _Alert;

  factory Alert.fromJson(Map<String, dynamic> json) => _$AlertFromJson(json);
}
