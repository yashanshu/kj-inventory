import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../models/dashboard.dart';

class CategoryPieChart extends StatelessWidget {
  final List<CategoryBreakdown> breakdown;

  const CategoryPieChart({super.key, required this.breakdown});

  static const _defaultColors = [
    Color(0xFF2563EB),
    Color(0xFF16A34A),
    Color(0xFFF59E0B),
    Color(0xFFDC2626),
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
    Color(0xFF06B6D4),
    Color(0xFFF97316),
  ];

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: PieChart(
                PieChartData(
                  sections: breakdown.asMap().entries.map((entry) {
                    final i = entry.key;
                    final cat = entry.value;
                    final color = cat.color != null
                        ? AppTheme.fromHex(cat.color)
                        : _defaultColors[i % _defaultColors.length];
                    return PieChartSectionData(
                      value: cat.itemCount.toDouble(),
                      title: '${cat.itemCount}',
                      color: color,
                      radius: 60,
                      titleStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    );
                  }).toList(),
                  sectionsSpace: 2,
                  centerSpaceRadius: 30,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: breakdown.asMap().entries.map((entry) {
                final i = entry.key;
                final cat = entry.value;
                final color = cat.color != null
                    ? AppTheme.fromHex(cat.color)
                    : _defaultColors[i % _defaultColors.length];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        cat.categoryName,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
