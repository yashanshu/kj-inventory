import type { Item, Category } from '../../types/inventory';
import { useStockStatus } from '../../hooks/useStockStatus';

interface ItemCardProps {
  item: Item;
  category: Category | null;
  onAdjust: (item: Item) => void;
  onEdit: (item: Item) => void;
  showUnitCost?: boolean;
  canEdit?: boolean;
}

export function ItemCard({
  item,
  category,
  onAdjust,
  onEdit,
  showUnitCost = true,
  canEdit = true,
}: ItemCardProps) {
  const status = useStockStatus(item);
  const gridCols = showUnitCost ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
          {category ? (
            <div className="flex items-center space-x-2 mt-1">
              {category.color && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <p className="text-xs text-gray-600">{category.name}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">No category</p>
          )}
          {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
        </div>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      <div className={`grid ${gridCols} gap-3 mb-3 text-sm`}>
        <div>
          <p className="text-xs text-gray-500">Stock</p>
          <p className="font-semibold text-gray-900">
            {item.currentStock} {item.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Min</p>
          <p className="font-medium text-gray-700">
            {item.minimumThreshold} {item.unit}
          </p>
        </div>
        {showUnitCost && (
          <div>
            <p className="text-xs text-gray-500">Cost</p>
            <p className="font-medium text-gray-700">
              {item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : '-'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {canEdit && (
          <button
            onClick={() => onEdit(item)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={() => onAdjust(item)}
          className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors"
        >
          Adjust
        </button>
      </div>
    </div>
  );
}
