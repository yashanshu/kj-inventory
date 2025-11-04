import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateItem, useCategories } from '../../hooks/useInventory';
import type { Unit } from '../../types/inventory';
import { toast } from '../Toast';

interface AddItemModalProps {
  onClose: () => void;
}

export function AddItemModal({ onClose }: AddItemModalProps) {
  const { data: categories } = useCategories();
  const createItem = useCreateItem();

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    unit: 'pcs' as Unit,
    currentStock: '0',
    minimumThreshold: '0',
    unitCost: '',
    trackStock: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createItem.mutateAsync({
        name: formData.name,
        categoryId: formData.categoryId,
        unit: formData.unit,
        currentStock: parseInt(formData.currentStock),
        minimumThreshold: parseInt(formData.minimumThreshold),
        sku: formData.sku || undefined,
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
        trackStock: formData.trackStock,
      });
      toast.success(`${formData.name} has been added to inventory`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create item. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Add New Item</h2>
            <p className="text-sm text-gray-500 mt-1">Create a new inventory item</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4" id="add-item-form">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU
                <span className="text-xs text-gray-500 ml-2">(Stock Keeping Unit)</span>
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter SKU (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stock <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="gm">Grams</option>
                  <option value="ltr">Liters</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Threshold <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minimumThreshold}
                onChange={(e) => setFormData({ ...formData, minimumThreshold: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Alert when stock falls below this"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Cost
                <span className="text-xs text-gray-500 ml-2">(Cost per unit)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.trackStock}
                  onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span>Track low stock alerts for this item</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Disable tracking for seasonal or archived items that shouldn&apos;t appear in low/out-of-stock lists.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createItem.isPending}
              className="px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-item-form"
              disabled={createItem.isPending}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-md transition-all"
            >
              {createItem.isPending ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
