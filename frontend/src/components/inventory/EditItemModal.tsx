import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Category, Item, Unit, UpdateItemRequest } from '../../types/inventory';
import { useUpdateItem } from '../../hooks/useInventory';
import { toast } from '../Toast';

interface EditItemModalProps {
  item: Item;
  categories?: Category[];
  onClose: () => void;
}

export function EditItemModal({ item, categories = [], onClose }: EditItemModalProps) {
  const updateItem = useUpdateItem();
  const [formData, setFormData] = useState(() => ({
    name: item.name,
    sku: item.sku ?? '',
    categoryId: item.categoryId,
    unit: item.unit as Unit,
    minimumThreshold: item.minimumThreshold.toString(),
    unitCost: item.unitCost ? item.unitCost.toString() : '',
    trackStock: item.trackStock,
    isActive: item.isActive,
  }));

  useEffect(() => {
    setFormData({
      name: item.name,
      sku: item.sku ?? '',
      categoryId: item.categoryId,
      unit: item.unit as Unit,
      minimumThreshold: item.minimumThreshold.toString(),
      unitCost: item.unitCost ? item.unitCost.toString() : '',
      trackStock: item.trackStock,
      isActive: item.isActive,
    });
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateItemRequest = {
      name: formData.name.trim() || item.name,
      sku: formData.sku.trim() ? formData.sku.trim() : undefined,
      categoryId: formData.categoryId,
      unit: formData.unit,
      minimumThreshold: Number.isNaN(parseInt(formData.minimumThreshold, 10))
        ? item.minimumThreshold
        : parseInt(formData.minimumThreshold, 10),
      unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
      trackStock: formData.trackStock,
      isActive: formData.isActive,
    };

    try {
      await updateItem.mutateAsync({ id: item.id, data: payload });
      toast.success(`${formData.name || item.name} has been updated`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Edit Item</h2>
            <p className="text-sm text-gray-500 mt-1">Update item details or move it to another category</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4" id="edit-item-form">
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU
                <span className="text-xs text-gray-500 ml-2">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Threshold <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.minimumThreshold}
                  onChange={(e) => setFormData({ ...formData, minimumThreshold: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Current Stock</p>
                <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {item.currentStock} {item.unit}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Adjust stock levels from the inventory list using Quick or Desktop adjust.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.trackStock}
                  onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span>Track low stock alerts</span>
              </label>
              <p className="text-xs text-gray-500">
                Disable tracking for seasonal items so they don&apos;t appear in low or out-of-stock lists.
              </p>

              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span>Active item</span>
              </label>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={updateItem.isPending}
            className="px-4 py-2 border border-indigo-200 text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-item-form"
            disabled={updateItem.isPending}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-md transition-all"
          >
            {updateItem.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
