import type { Item, Category } from '../../types/inventory';
import { useStockStatus } from '../../hooks/useStockStatus';
import { Edit2, ArrowUpDown } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  category: Category | null;
  onAdjust: (item: Item) => void;
  onEdit: (item: Item) => void;
  showUnitCost?: boolean;
  canEdit?: boolean;
}

export function ItemCard({ item, category, onAdjust, onEdit, showUnitCost = true, canEdit = true }: ItemCardProps) {
  const status = useStockStatus(item);
  const isOut = item.currentStock === 0;
  const pct = item.minimumThreshold > 0
    ? Math.min(100, (item.currentStock / item.minimumThreshold) * 100)
    : 100;

  const badgeClass = isOut ? 'badge-danger' : status.label === 'Low Stock' ? 'badge-warning' : 'badge-success';

  return (
    <div style={{
      padding: '1rem 1.125rem',
      borderBottom: '1px solid var(--neutral-100)',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--neutral-50)'}
    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ''}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--neutral-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: 3 }}>
            {category?.color && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: category.color }} />
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              {category?.name || 'Uncategorized'}
            </span>
            {item.sku && (
              <>
                <span style={{ color: 'var(--neutral-300)' }}>·</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{item.sku}</span>
              </>
            )}
          </div>
        </div>
        <span className={`badge ${badgeClass}`}>{status.label}</span>
      </div>

      {/* Stock bar */}
      <div style={{ marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Stock level</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-800)' }}>
            {item.currentStock} / {item.minimumThreshold} {item.unit}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'var(--neutral-100)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${pct}%`,
            background: isOut ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {showUnitCost && item.unitCost != null && (
          <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            ₹{item.unitCost.toFixed(2)} / {item.unit}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {canEdit && (
          <button
            onClick={() => onEdit(item)}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Edit2 style={{ width: 13, height: 13 }} />
            Edit
          </button>
        )}
        <button
          onClick={() => onAdjust(item)}
          className="btn btn-primary btn-sm"
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <ArrowUpDown style={{ width: 13, height: 13 }} />
          Adjust
        </button>
      </div>
    </div>
  );
}
