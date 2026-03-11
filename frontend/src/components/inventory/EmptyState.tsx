import { PackageOpen, Plus, Filter } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
  onAddItem?: () => void;
}

export function EmptyState({ hasFilters, onAddItem }: EmptyStateProps) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', marginBottom: '1rem',
        background: 'var(--neutral-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {hasFilters
          ? <Filter style={{ width: 24, height: 24, color: 'var(--neutral-400)' }} />
          : <PackageOpen style={{ width: 24, height: 24, color: 'var(--neutral-400)' }} />}
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--neutral-800)', marginBottom: 6 }}>
        {hasFilters ? 'No items match your filters' : 'No items yet'}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginBottom: '1.5rem' }}>
        {hasFilters
          ? 'Try adjusting your search or filters'
          : 'Add your first inventory item to get started'}
      </p>
      {!hasFilters && onAddItem && (
        <button onClick={onAddItem} className="btn btn-primary">
          <Plus style={{ width: 15, height: 15 }} />
          Add First Item
        </button>
      )}
    </div>
  );
}
