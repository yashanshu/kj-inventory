import { useState } from 'react';
import { Plus, Download, FolderCog, SlidersHorizontal, X } from 'lucide-react';
import { useItems, useCategories } from '../hooks/useInventory';
import { useInventoryFilters } from '../hooks/useInventoryFilters';
import { useCategoryMap } from '../hooks/useCategoryMap';
import type { Item } from '../types/inventory';
import { AddItemModal } from '../components/inventory/AddItemModal';
import { DesktopStockAdjust } from '../components/inventory/DesktopStockAdjust';
import { BottomSheetStockAdjust } from '../components/inventory/BottomSheetStockAdjust';
import { SearchBar } from '../components/inventory/SearchBar';
import { CategoryFilter } from '../components/inventory/CategoryFilter';
import { ItemRow } from '../components/inventory/ItemRow';
import { ItemCard } from '../components/inventory/ItemCard';
import { EmptyState } from '../components/inventory/EmptyState';
import { Pagination } from '../components/inventory/Pagination';
import { TableSkeleton, CategoryPillsSkeleton } from '../components/LoadingSkeleton';
import { exportItemsToCSV, generateExportFilename } from '../utils/export';
import { toast } from '../components/Toast';
import { EditItemModal } from '../components/inventory/EditItemModal';
import { CategoryManagerModal } from '../components/inventory/CategoryManagerModal';
import { ActionMenu } from '../components/inventory/ActionMenu';
import { useAuthStore } from '../store/authStore';
import { canEditItems, canManageCategories, canViewUnitCost } from '../utils/roles';

export function InventoryPage() {
  const filters = useInventoryFilters();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: items, isLoading: itemsLoading } = useItems(filters.queryParams);
  const categoryMap = useCategoryMap(categories);
  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const allowItemEdits = canEditItems(userRole);
  const showUnitCost = canViewUnitCost(userRole);
  const allowCategoryManagement = canManageCategories(userRole);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [useDesktopModal, setUseDesktopModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const filteredItems = items?.items || [];
  const totalItems = items?.total || 0;
  const hasFilters = !!(filters.searchTerm || filters.selectedCategoryId || filters.lowStockOnly);

  const handleAdjustStock = (item: Item) => {
    setSelectedItem(item);
    setUseDesktopModal(window.innerWidth >= 768);
  };

  const handleEditItem = (item: Item) => {
    if (!allowItemEdits) {
      toast.error('Admin access required to edit items');
      return;
    }
    setEditingItem(item);
  };

  const handleAddItemClick = () => {
    if (!allowItemEdits) {
      toast.error('Admin access required to add items');
      return;
    }
    setShowAddModal(true);
  };

  const handleExport = () => {
    if (filteredItems.length === 0) {
      toast.error('No items to export');
      return;
    }
    try {
      exportItemsToCSV(filteredItems, categoryMap, generateExportFilename());
      toast.success(`Exported ${filteredItems.length} items to CSV`);
    } catch {
      toast.error('Failed to export items');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">Inventory</h1>
          {totalItems > 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: 4 }}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} total
            </p>
          )}
        </div>

        {/* Mobile: Dropdown Menu */}
        <div className="md:hidden">
          <ActionMenu
            onAddItem={allowItemEdits ? handleAddItemClick : undefined}
            onExport={totalItems > 0 ? handleExport : undefined}
            onManageCategories={allowCategoryManagement ? () => setShowCategoryManager(true) : undefined}
            showExport={totalItems > 0}
            showManageCategories={allowCategoryManagement}
          />
        </div>

        {/* Desktop: Individual Buttons */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '0.625rem' }}>
          {allowCategoryManagement && (
            <button onClick={() => setShowCategoryManager(true)} className="btn btn-secondary">
              <FolderCog style={{ width: 15, height: 15 }} />
              Categories
            </button>
          )}
          {totalItems > 0 && (
            <button onClick={handleExport} className="btn btn-secondary">
              <Download style={{ width: 15, height: 15 }} />
              Export
            </button>
          )}
          {allowItemEdits && (
            <button onClick={handleAddItemClick} className="btn btn-primary">
              <Plus style={{ width: 15, height: 15 }} />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Top row: search + low-stock toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={filters.localSearchTerm} onChange={filters.setLocalSearchTerm} />
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: 'pointer', userSelect: 'none',
            padding: '0.5625rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${filters.lowStockOnly ? 'var(--brand-200)' : 'var(--neutral-200)'}`,
            background: filters.lowStockOnly ? 'var(--brand-50)' : 'var(--neutral-0)',
            fontSize: '0.875rem', fontWeight: 500,
            color: filters.lowStockOnly ? 'var(--brand-700)' : 'var(--neutral-600)',
            transition: 'all 0.15s', flexShrink: 0,
          }}>
            <SlidersHorizontal style={{ width: 14, height: 14 }} />
            <input
              type="checkbox"
              checked={filters.lowStockOnly}
              onChange={filters.handleLowStockToggle}
              style={{ display: 'none' }}
            />
            Low stock
          </label>
          {hasFilters && (
            <button
              onClick={filters.resetFilters}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--neutral-500)', flexShrink: 0 }}
            >
              <X style={{ width: 13, height: 13 }} />
              Clear
            </button>
          )}
        </div>

        {/* Category pills */}
        {categoriesLoading ? (
          <CategoryPillsSkeleton />
        ) : (
          categories && categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCategoryId={filters.selectedCategoryId}
              onSelectCategory={filters.handleCategoryChange}
            />
          )
        )}
      </div>

      {/* Items list */}
      {itemsLoading ? (
        <TableSkeleton rows={filters.pageSize} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onAddItem={allowItemEdits ? handleAddItemClick : undefined}
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Mobile: Card View */}
          <div className="lg:hidden">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                category={categoryMap.get(item.categoryId) || null}
                onAdjust={handleAdjustStock}
                onEdit={handleEditItem}
                showUnitCost={showUnitCost}
                canEdit={allowItemEdits}
              />
            ))}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden lg:block" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Status</th>
                  {showUnitCost && <th>Unit Cost</th>}
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    category={categoryMap.get(item.categoryId) || null}
                    onAdjust={handleAdjustStock}
                    onEdit={handleEditItem}
                    showUnitCost={showUnitCost}
                    canEdit={allowItemEdits}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <Pagination
              currentPage={filters.page}
              pageSize={filters.pageSize}
              totalItems={totalItems}
              onPageChange={filters.setPage}
              onPageSizeChange={filters.handlePageSizeChange}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {allowItemEdits && showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} />}
      {allowItemEdits && editingItem && (
        <EditItemModal item={editingItem} categories={categories} onClose={() => setEditingItem(null)} />
      )}
      {selectedItem && (
        useDesktopModal ? (
          <DesktopStockAdjust item={selectedItem} onClose={() => setSelectedItem(null)} />
        ) : (
          <BottomSheetStockAdjust item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
        )
      )}
      {allowCategoryManagement && showCategoryManager && (
        <CategoryManagerModal categories={categories} onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  );
}
