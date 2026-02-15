import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/movement.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/movement_provider.dart';
import '../../providers/providers.dart';

class AddMovementScreen extends ConsumerStatefulWidget {
  final String? itemId;

  const AddMovementScreen({super.key, this.itemId});

  @override
  ConsumerState<AddMovementScreen> createState() => _AddMovementScreenState();
}

class _AddMovementScreenState extends ConsumerState<AddMovementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();
  final _referenceController = TextEditingController();
  MovementType _type = MovementType.stockIn;
  String? _selectedItemId;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedItemId = widget.itemId;
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _notesController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedItemId == null) return;
    setState(() => _isSubmitting = true);

    try {
      final repo = ref.read(movementRepositoryProvider);
      await repo.createMovement(
        CreateMovementRequest(
          itemId: _selectedItemId!,
          movementType: _type,
          quantity: double.parse(_quantityController.text),
          reference: _referenceController.text.isEmpty
              ? null
              : _referenceController.text.trim(),
          notes: _notesController.text.isEmpty
              ? null
              : _notesController.text.trim(),
        ),
      );

      ref.read(inventoryProvider.notifier).refresh();
      ref.invalidate(itemMovementsProvider(_selectedItemId!));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Movement recorded')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(inventoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Record Movement')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Item selector (if not pre-selected)
              if (widget.itemId == null)
                DropdownButtonFormField<String>(
                  value: _selectedItemId,
                  decoration: const InputDecoration(labelText: 'Item'),
                  isExpanded: true,
                  items: state.items
                      .map((item) => DropdownMenuItem(
                            value: item.id,
                            child: Text(
                                '${item.name} (${item.currentStock} ${item.unit})'),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedItemId = v),
                  validator: (v) => v == null ? 'Select an item' : null,
                ),
              if (widget.itemId == null) const SizedBox(height: 16),

              // Movement type
              Text('Movement Type',
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              SegmentedButton<MovementType>(
                segments: const [
                  ButtonSegment(
                    value: MovementType.stockIn,
                    label: Text('Stock In'),
                    icon: Icon(Icons.add_circle_outline),
                  ),
                  ButtonSegment(
                    value: MovementType.stockOut,
                    label: Text('Stock Out'),
                    icon: Icon(Icons.remove_circle_outline),
                  ),
                  ButtonSegment(
                    value: MovementType.adjustment,
                    label: Text('Adjust'),
                    icon: Icon(Icons.tune),
                  ),
                ],
                selected: {_type},
                onSelectionChanged: (selected) {
                  setState(() => _type = selected.first);
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _quantityController,
                decoration: const InputDecoration(labelText: 'Quantity'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  final n = double.tryParse(v);
                  if (n == null || n <= 0) return 'Must be greater than 0';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _referenceController,
                decoration:
                    const InputDecoration(labelText: 'Reference (optional)'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesController,
                decoration:
                    const InputDecoration(labelText: 'Notes (optional)'),
                maxLines: 3,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _isSubmitting ? null : _submit,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Record Movement'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
