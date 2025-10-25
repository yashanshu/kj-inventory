import { render, screen } from '@testing-library/react';
import type { Item, Category } from '../../types/inventory';
import { ItemCard } from './ItemCard';

const baseItem: Item = {
  id: 'item-1',
  organizationId: 'org-1',
  categoryId: 'category-1',
  name: 'Sample Item',
  unit: 'pcs',
  minimumThreshold: 2,
  currentStock: 10,
  isActive: true,
  trackStock: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const baseCategory: Category = {
  id: 'category-1',
  organizationId: 'org-1',
  name: 'Category',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('ItemCard', () => {
  it('hides edit button when canEdit is false', () => {
    render(
      <ItemCard
        item={baseItem}
        category={baseCategory}
        onAdjust={() => {}}
        onEdit={() => {}}
        canEdit={false}
      />
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument();
  });

  it('hides unit cost when showUnitCost is false', () => {
    const itemWithCost: Item = { ...baseItem, unitCost: 9.99 };

    render(
      <ItemCard
        item={itemWithCost}
        category={baseCategory}
        onAdjust={() => {}}
        onEdit={() => {}}
        showUnitCost={false}
      />
    );

    expect(screen.queryByText('$9.99')).not.toBeInTheDocument();
  });
});
