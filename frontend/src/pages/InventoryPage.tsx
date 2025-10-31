import { useState } from 'react';
import { Plus, Download, FolderCog } from 'lucide-react';
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
    // Detect screen size - use desktop modal for large screens, bottom sheet for mobile
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
    } catch (error) {
      toast.error('Failed to export items');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>

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
        <div className="hidden md:flex items-center space-x-3">
          {allowCategoryManagement && (
            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <FolderCog className="w-5 h-5" />
              <span>Manage Categories</span>
            </button>
          )}
          {totalItems > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          )}
          {allowItemEdits && (
            <button
              onClick={handleAddItemClick}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 space-y-3 sm:space-y-4">
        <SearchBar
          value={filters.localSearchTerm}
          onChange={filters.setLocalSearchTerm}
        />

        {/* Category Filter */}
        {categoriesLoading ? (
          <CategoryPillsSkeleton />
        ) : (
          categories && (
            <CategoryFilter
              categories={categories}
              selectedCategoryId={filters.selectedCategoryId}
              onSelectCategory={filters.handleCategoryChange}
            />
          )
        )}

        {/* Additional Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.lowStockOnly}
              onChange={filters.handleLowStockToggle}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Low stock only</span>
          </label>

          {hasFilters && (
            <button
              onClick={filters.resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium self-start sm:self-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Items Table */}
      {itemsLoading ? (
        <TableSkeleton rows={filters.pageSize} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onAddItem={allowItemEdits ? handleAddItemClick : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile: Card View */}
          <div className="lg:hidden divide-y divide-gray-200">
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
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {showUnitCost && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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

          {/* Pagination */}
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
      {allowItemEdits && showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} />
      )}
      {allowItemEdits && editingItem && (
        <EditItemModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
        />
      )}
      {selectedItem && (
        <>
          {useDesktopModal ? (
            <DesktopStockAdjust
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <BottomSheetStockAdjust item={selectedItem} onClose={() => setSelectedItem(null)} />
          )}
        </>
      )}
      {allowCategoryManagement && showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}
