import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/dashboard.dart';

class StockTrendChart extends StatelessWidget {
  final List<StockTrend> trends;

  const StockTrendChart({super.key, required this.trends});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: BarChart(
          BarChartData(
            alignment: BarChartAlignment.spaceAround,
            maxY: _maxY,
            barGroups: trends.asMap().entries.map((entry) {
              final i = entry.key;
              final t = entry.value;
              return BarChartGroupData(
                x: i,
                barRods: [
                  BarChartRodData(
                    toY: t.stockIn.toDouble(),
                    color: AppTheme.successColor,
                    width: 8,
                  ),
                  BarChartRodData(
                    toY: t.stockOut.toDouble(),
                    color: AppTheme.errorColor,
                    width: 8,
                  ),
                  BarChartRodData(
                    toY: t.adjustments.toDouble(),
                    color: AppTheme.primaryColor,
                    width: 8,
                  ),
                ],
              );
            }).toList(),
            titlesData: FlTitlesData(
              topTitles:
                  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles:
                  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, _) {
                    final idx = value.toInt();
                    if (idx < 0 || idx >= trends.length) {
                      return const SizedBox.shrink();
                    }
                    final date = trends[idx].date;
                    // Show just day part (e.g. "15")
                    final day = date.length >= 10 ? date.substring(8, 10) : date;
                    return Text(day,
                        style: const TextStyle(fontSize: 10));
                  },
                ),
              ),
              leftTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: true, reservedSize: 32),
              ),
            ),
            borderData: FlBorderData(show: false),
            gridData: const FlGridData(show: true, drawVerticalLine: false),
          ),
        ),
      ),
    );
  }

  double get _maxY {
    double max = 0;
    for (final t in trends) {
      final vals = [t.stockIn, t.stockOut, t.adjustments];
      for (final v in vals) {
        if (v > max) max = v.toDouble();
      }
    }
    return max == 0 ? 10 : max * 1.2;
  }
}
