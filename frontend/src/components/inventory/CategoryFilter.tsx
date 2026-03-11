import type { Category } from '../../types/inventory';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export function CategoryFilter({ categories, selectedCategoryId, onSelectCategory }: CategoryFilterProps) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: 2 }} className="scrollbar-hide">
      <button
        onClick={() => onSelectCategory(null)}
        style={{
          flexShrink: 0,
          padding: '0.3125rem 0.875rem',
          borderRadius: 99,
          fontSize: '0.8125rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          border: '1px solid',
          borderColor: !selectedCategoryId ? 'var(--brand-600)' : 'var(--neutral-200)',
          background: !selectedCategoryId ? 'var(--brand-600)' : 'var(--neutral-0)',
          color: !selectedCategoryId ? '#fff' : 'var(--neutral-600)',
        }}
      >
        All
      </button>
      {categories.filter((cat) => cat.id).map((category) => {
        const isSelected = selectedCategoryId === category.id;
        const color = category.color || '#6366f1';
        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.3125rem',
              padding: '0.3125rem 0.75rem',
              borderRadius: 99,
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              border: `1px solid ${isSelected ? color : 'var(--neutral-200)'}`,
              background: isSelected ? color : 'var(--neutral-0)',
              color: isSelected ? '#fff' : 'var(--neutral-600)',
            }}
          >
            {!isSelected && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: color,
              }} />
            )}
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
