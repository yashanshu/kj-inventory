import type { Item, Category } from '../../types/inventory';
import { useStockStatus } from '../../hooks/useStockStatus';
import { Edit2, Package } from 'lucide-react';

interface ItemRowProps {
  item: Item;
  category: Category | null;
  onAdjust: (item: Item) => void;
  onEdit: (item: Item) => void;
  showUnitCost?: boolean;
  canEdit?: boolean;
}

export function ItemRow({
  item,
  category,
  onAdjust,
  onEdit,
  showUnitCost = true,
  canEdit = true,
}: ItemRowProps) {
  const status = useStockStatus(item);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{item.name}</div>
        {item.sku && <div className="text-sm text-gray-500">SKU: {item.sku}</div>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {category ? (
          <div className="flex items-center space-x-2">
            {category.color && (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
            )}
            <span className="text-sm text-gray-900">{category.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">N/A</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {item.currentStock} {item.unit}
        </div>
        <div className="text-xs text-gray-500">
          Min: {item.minimumThreshold} {item.unit}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}
        >
          {status.label}
        </span>
      </td>
      {showUnitCost && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : '-'}
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          {canEdit && (
            <button
              onClick={() => onEdit(item)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={() => onAdjust(item)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-all"
          >
            <Package className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
