import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/item.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/providers.dart';

class ItemFormScreen extends ConsumerStatefulWidget {
  final String? itemId;

  const ItemFormScreen({super.key, this.itemId});

  @override
  ConsumerState<ItemFormScreen> createState() => _ItemFormScreenState();
}

class _ItemFormScreenState extends ConsumerState<ItemFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _skuController = TextEditingController();
  final _thresholdController = TextEditingController();
  final _stockController = TextEditingController();
  final _costController = TextEditingController();
  String _unit = 'pcs';
  String? _categoryId;
  bool _trackStock = true;
  bool _isSubmitting = false;

  bool get _isEditing => widget.itemId != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final state = ref.read(inventoryProvider);
      final item = state.items.where((i) => i.id == widget.itemId).firstOrNull;
      if (item != null) {
        _nameController.text = item.name;
        _skuController.text = item.sku ?? '';
        _thresholdController.text = item.minimumThreshold.toString();
        _stockController.text = item.currentStock.toString();
        _costController.text = item.unitCost?.toString() ?? '';
        _unit = item.unit;
        _categoryId = item.categoryId;
        _trackStock = item.trackStock;
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _skuController.dispose();
    _thresholdController.dispose();
    _stockController.dispose();
    _costController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _categoryId == null) return;
    setState(() => _isSubmitting = true);

    try {
      final repo = ref.read(inventoryRepositoryProvider);

      if (_isEditing) {
        await repo.updateItem(
          widget.itemId!,
          UpdateItemRequest(
            name: _nameController.text.trim(),
            sku: _skuController.text.trim().isEmpty
                ? null
                : _skuController.text.trim(),
            unit: _unit,
            categoryId: _categoryId,
            minimumThreshold: double.parse(_thresholdController.text),
            unitCost: _costController.text.isEmpty
                ? null
                : double.parse(_costController.text),
            trackStock: _trackStock,
          ),
        );
      } else {
        await repo.createItem(
          CreateItemRequest(
            name: _nameController.text.trim(),
            sku: _skuController.text.trim().isEmpty
                ? null
                : _skuController.text.trim(),
            unit: _unit,
            categoryId: _categoryId!,
            minimumThreshold: double.parse(_thresholdController.text),
            currentStock: double.parse(_stockController.text),
            unitCost: _costController.text.isEmpty
                ? null
                : double.parse(_costController.text),
            trackStock: _trackStock,
          ),
        );
      }

      ref.read(inventoryProvider.notifier).refresh();
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Item' : 'New Item'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _skuController,
                decoration: const InputDecoration(labelText: 'SKU (optional)'),
              ),
              const SizedBox(height: 12),
              categories.when(
                data: (cats) => DropdownButtonFormField<String>(
                  value: _categoryId,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: cats
                      .map((c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(c.name),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _categoryId = v),
                  validator: (v) => v == null ? 'Required' : null,
                ),
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Failed to load categories'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _unit,
                decoration: const InputDecoration(labelText: 'Unit'),
                items: const [
                  DropdownMenuItem(value: 'pcs', child: Text('Pieces')),
                  DropdownMenuItem(value: 'kg', child: Text('Kilograms')),
                  DropdownMenuItem(value: 'gm', child: Text('Grams')),
                  DropdownMenuItem(value: 'ltr', child: Text('Litres')),
                  DropdownMenuItem(value: 'ml', child: Text('Millilitres')),
                ],
                onChanged: (v) => setState(() => _unit = v!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _thresholdController,
                decoration:
                    const InputDecoration(labelText: 'Minimum Threshold'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if (double.tryParse(v) == null) return 'Invalid number';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              if (!_isEditing)
                TextFormField(
                  controller: _stockController,
                  decoration:
                      const InputDecoration(labelText: 'Initial Stock'),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (double.tryParse(v) == null) return 'Invalid number';
                    return null;
                  },
                ),
              if (!_isEditing) const SizedBox(height: 12),
              TextFormField(
                controller: _costController,
                decoration:
                    const InputDecoration(labelText: 'Unit Cost (optional)'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                title: const Text('Track Stock'),
                subtitle:
                    const Text('Enable low-stock alerts for this item'),
                value: _trackStock,
                onChanged: (v) => setState(() => _trackStock = v),
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
                      : Text(_isEditing ? 'Update Item' : 'Create Item'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
