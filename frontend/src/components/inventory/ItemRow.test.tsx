import { render, screen } from '@testing-library/react';
import type { Item, Category } from '../../types/inventory';
import { ItemRow } from './ItemRow';

function renderInTable(node: React.ReactNode) {
  return render(
    <table>
      <tbody>{node}</tbody>
    </table>
  );
}

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

describe('ItemRow', () => {
  it('hides edit button when canEdit is false', () => {
    renderInTable(
      <ItemRow
        item={baseItem}
        category={baseCategory}
        onAdjust={() => {}}
        onEdit={() => {}}
        canEdit={false}
      />
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust stock/i })).toBeInTheDocument();
  });

  it('hides unit cost when showUnitCost is false', () => {
    const itemWithCost: Item = { ...baseItem, unitCost: 12.5 };

    renderInTable(
      <ItemRow
        item={itemWithCost}
        category={baseCategory}
        onAdjust={() => {}}
        onEdit={() => {}}
        showUnitCost={false}
      />
    );

    expect(screen.queryByText('$12.50')).not.toBeInTheDocument();
  });
});
