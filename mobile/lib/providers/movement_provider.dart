import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/movement.dart';
import 'providers.dart';

final itemMovementsProvider = FutureProvider.family<List<StockMovement>, String>(
  (ref, itemId) async {
    final repo = ref.watch(movementRepositoryProvider);
    return repo.getItemMovements(itemId);
  },
);
