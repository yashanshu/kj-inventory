import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../models/alert.dart';
import '../../providers/dashboard_provider.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(dashboardProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Alerts')),
      body: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Failed to load alerts'),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () => ref.invalidate(dashboardProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          if (data.alerts.isEmpty) {
            return const Center(child: Text('No alerts'));
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(dashboardProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: data.alerts.length,
              itemBuilder: (context, index) {
                final alert = data.alerts[index];
                return _alertCard(alert, theme);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _alertCard(Alert alert, ThemeData theme) {
    final severityColor = switch (alert.severity) {
      AlertSeverity.critical => AppTheme.errorColor,
      AlertSeverity.warning => AppTheme.warningColor,
      AlertSeverity.info => AppTheme.primaryColor,
    };

    final typeIcon = switch (alert.type) {
      AlertType.outOfStock => Icons.error_outline,
      AlertType.lowStock => Icons.warning_amber,
    };

    return Card(
      child: ListTile(
        leading: Icon(typeIcon, color: severityColor),
        title: Text(
          alert.title,
          style: TextStyle(
            fontWeight: alert.isRead ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(alert.message),
            if (alert.item != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${alert.item!.currentStock} ${alert.item!.unit} remaining',
                  style: TextStyle(
                    color: severityColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ),
          ],
        ),
        trailing: alert.isRead
            ? null
            : Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: severityColor,
                  shape: BoxShape.circle,
                ),
              ),
      ),
    );
  }
}
