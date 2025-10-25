import { PackageOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
  onAddItem?: () => void;
}

export function EmptyState({ hasFilters, onAddItem }: EmptyStateProps) {
  return (
    <div className="text-center py-16 bg-white rounded-lg shadow">
      <div className="text-gray-400 mb-4">
        <PackageOpen className="w-16 h-16 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {hasFilters ? 'No items found' : 'No items in inventory'}
      </h3>
      <p className="text-gray-500 mb-6">
        {hasFilters
          ? 'Try adjusting your filters or search query'
          : 'Get started by adding your first item'}
      </p>
      {!hasFilters && onAddItem && (
        <button
          onClick={onAddItem}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Your First Item</span>
        </button>
      )}
    </div>
  );
}
