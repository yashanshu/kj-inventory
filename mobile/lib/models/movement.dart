import 'package:freezed_annotation/freezed_annotation.dart';
import 'item.dart';
import 'user.dart';

part 'movement.freezed.dart';
part 'movement.g.dart';

enum MovementType {
  @JsonValue('IN')
  stockIn,
  @JsonValue('OUT')
  stockOut,
  @JsonValue('ADJUSTMENT')
  adjustment,
}

@freezed
class StockMovement with _$StockMovement {
  const factory StockMovement({
    required String id,
    required String itemId,
    required MovementType movementType,
    required double quantity,
    required double previousStock,
    required double newStock,
    String? reference,
    String? notes,
    required String createdBy,
    required String createdAt,
    Item? item,
    User? user,
  }) = _StockMovement;

  factory StockMovement.fromJson(Map<String, dynamic> json) =>
      _$StockMovementFromJson(json);
}

@freezed
class CreateMovementRequest with _$CreateMovementRequest {
  const factory CreateMovementRequest({
    required String itemId,
    required MovementType movementType,
    required double quantity,
    String? reference,
    String? notes,
  }) = _CreateMovementRequest;

  factory CreateMovementRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateMovementRequestFromJson(json);
}
