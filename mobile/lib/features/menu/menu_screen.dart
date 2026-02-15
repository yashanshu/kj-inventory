import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/menu_provider.dart';

class MenuScreen extends ConsumerWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menusAsync = ref.watch(menusProvider);

    return menusAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Failed to load menus'),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: () => ref.invalidate(menusProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (menus) {
        if (menus.isEmpty) {
          return const Center(child: Text('No menu data available'));
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(menusProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: menus.length,
            itemBuilder: (context, index) {
              final menu = menus[index];
              final offers = menu.parsedOffers;
              final categories = menu.parsedCategories;

              return Card(
                child: ListTile(
                  onTap: () =>
                      context.push('/menu/${menu.restaurantId}'),
                  leading: CircleAvatar(
                    child: Text(menu.restaurantName.isNotEmpty
                        ? menu.restaurantName[0]
                        : '?'),
                  ),
                  title: Text(menu.restaurantName),
                  subtitle: Text(
                    '${categories.length} categories \u2022 ${offers.length} offers',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
