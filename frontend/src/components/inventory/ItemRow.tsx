import type { Item, Category } from '../../types/inventory';
import { useStockStatus } from '../../hooks/useStockStatus';
import { Edit2, ArrowUpDown } from 'lucide-react';

interface ItemRowProps {
  item: Item;
  category: Category | null;
  onAdjust: (item: Item) => void;
  onEdit: (item: Item) => void;
  showUnitCost?: boolean;
  canEdit?: boolean;
}

export function ItemRow({ item, category, onAdjust, onEdit, showUnitCost = true, canEdit = true }: ItemRowProps) {
  const status = useStockStatus(item);
  const isOut = item.currentStock === 0;
  const badgeClass = isOut ? 'badge-danger' : status.label === 'Low Stock' ? 'badge-warning' : 'badge-success';

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500, color: 'var(--neutral-900)', fontSize: '0.875rem' }}>{item.name}</div>
        {item.sku && (
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: 2 }}>SKU: {item.sku}</div>
        )}
      </td>
      <td>
        {category ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {category.color && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: category.color }} />
            )}
            <span style={{ fontSize: '0.875rem', color: 'var(--neutral-700)' }}>{category.name}</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.875rem', color: 'var(--neutral-400)' }}>—</span>
        )}
      </td>
      <td>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--neutral-800)' }}>
          {item.currentStock} {item.unit}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: 2 }}>
          min {item.minimumThreshold} {item.unit}
        </div>
      </td>
      <td>
        <span className={`badge ${badgeClass}`}>{status.label}</span>
      </td>
      {showUnitCost && (
        <td style={{ fontSize: '0.875rem', color: 'var(--neutral-700)' }}>
          {item.unitCost != null ? `₹${item.unitCost.toFixed(2)}` : '—'}
        </td>
      )}
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {canEdit && (
            <button
              onClick={() => onEdit(item)}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--neutral-500)' }}
            >
              <Edit2 style={{ width: 13, height: 13 }} />
              Edit
            </button>
          )}
          <button
            onClick={() => onAdjust(item)}
            className="btn btn-primary btn-sm"
          >
            <ArrowUpDown style={{ width: 13, height: 13 }} />
            Adjust
          </button>
        </div>
      </td>
    </tr>
  );
}
