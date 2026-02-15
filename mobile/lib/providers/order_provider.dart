import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import 'providers.dart';

@immutable
class OrderState {
  final List<ExternalOrder> orders;
  final bool isLoading;
  final String? error;
  final String? platformFilter;

  const OrderState({
    this.orders = const [],
    this.isLoading = false,
    this.error,
    this.platformFilter,
  });

  OrderState copyWith({
    List<ExternalOrder>? orders,
    bool? isLoading,
    String? error,
    String? platformFilter,
    bool clearPlatform = false,
    bool clearError = false,
  }) {
    return OrderState(
      orders: orders ?? this.orders,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      platformFilter:
          clearPlatform ? null : (platformFilter ?? this.platformFilter),
    );
  }
}

class OrderNotifier extends StateNotifier<OrderState> {
  final Ref _ref;

  OrderNotifier(this._ref) : super(const OrderState());

  Future<void> fetchOrders() async {
    if (state.isLoading) return;
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final repo = _ref.read(orderRepositoryProvider);
      final orders = await repo.getOrders(
        platform: state.platformFilter,
      );
      state = state.copyWith(orders: orders, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setPlatformFilter(String? platform) {
    state = state.copyWith(
      platformFilter: platform,
      clearPlatform: platform == null,
      orders: [],
    );
    fetchOrders();
  }

  Future<void> refresh() => fetchOrders();
}

final orderProvider =
    StateNotifierProvider<OrderNotifier, OrderState>((ref) {
  return OrderNotifier(ref);
});

final orderStatsProvider = FutureProvider<OrderStats>((ref) async {
  final repo = ref.watch(orderRepositoryProvider);
  return repo.getStats();
});
