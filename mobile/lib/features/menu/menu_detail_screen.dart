import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/menu_provider.dart';

class MenuDetailScreen extends ConsumerWidget {
  final String restaurantId;

  const MenuDetailScreen({super.key, required this.restaurantId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menuAsync = ref.watch(menuDetailProvider(restaurantId));
    final theme = Theme.of(context);

    return menuAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Menu')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: const Text('Menu')),
        body: const Center(child: Text('Failed to load menu')),
      ),
      data: (menu) {
        final offers = menu.parsedOffers;
        final categories = menu.parsedCategories;

        return Scaffold(
          appBar: AppBar(title: Text(menu.restaurantName)),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Offers section
              if (offers.isNotEmpty) ...[
                Text('Active Offers', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                ...offers.map((offer) => Card(
                      color: Colors.amber.shade50,
                      child: ListTile(
                        leading: const Icon(Icons.local_offer,
                            color: Colors.amber),
                        title: Text(offer.title),
                        subtitle: offer.description != null
                            ? Text(offer.description!)
                            : null,
                      ),
                    )),
                const SizedBox(height: 24),
              ],

              // Categories + items
              if (categories.isNotEmpty) ...[
                Text('Menu', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                ...categories.map((cat) => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            cat.name,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        ...cat.items.map((item) => Card(
                              child: ListTile(
                                title: Text(item.name),
                                subtitle: item.description != null
                                    ? Text(
                                        item.description!,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      )
                                    : null,
                                trailing: item.price != null
                                    ? Text(
                                        '\u20B9${item.price!.toStringAsFixed(0)}',
                                        style: theme.textTheme.bodyLarge
                                            ?.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      )
                                    : null,
                              ),
                            )),
                        const SizedBox(height: 8),
                      ],
                    )),
              ],

              if (categories.isEmpty && offers.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Text('No menu details available'),
                  ),
                ),

              // Last fetched
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(
                  'Last updated: ${menu.fetchedAt}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
