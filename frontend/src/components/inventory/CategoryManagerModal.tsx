import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '../../types/inventory';
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useInventory';
import { toast } from '../Toast';

interface CategoryManagerModalProps {
  categories?: Category[];
  onClose: () => void;
}

interface CategoryFormState {
  name: string;
  description: string;
  color: string;
}

const initialFormState: CategoryFormState = {
  name: '',
  description: '',
  color: '',
};

export function CategoryManagerModal({ categories = [], onClose }: CategoryManagerModalProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [addForm, setAddForm] = useState<CategoryFormState>(initialFormState);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormState>(initialFormState);
  const [deleteState, setDeleteState] = useState<{ category: Category | null; targetCategoryId: string }>(
    {
      category: null,
      targetCategoryId: '',
    }
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      setEditForm({
        name: editingCategory.name,
        description: editingCategory.description ?? '',
        color: editingCategory.color ?? '',
      });
    }
  }, [editingCategory]);

  useEffect(() => {
    if (!isDeleteDialogOpen) {
      return;
    }
    const categoryToRefresh = deleteState.category;
    if (!categoryToRefresh) {
      return;
    }
    const freshCategory = categories.find((cat) => cat.id === categoryToRefresh.id);
    if (freshCategory) {
      setDeleteState((prev) => ({
        ...prev,
        category: freshCategory,
      }));
    }
  }, [categories, deleteState.category, isDeleteDialogOpen]);

  const selectableReassignmentTargets = useMemo(() => {
    if (!isDeleteDialogOpen || !deleteState.category) {
      return categories;
    }
    const categoryToCompare = deleteState.category;
    return categories.filter((cat) => cat.id !== categoryToCompare.id);
  }, [categories, deleteState.category, isDeleteDialogOpen]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addForm.name.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    try {
      await createCategory.mutateAsync({
        name,
        description: addForm.description.trim() || undefined,
        color: addForm.color.trim() || undefined,
      });
      toast.success(`${name} category created`);
      setAddForm(initialFormState);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) {
      return;
    }
    const name = editForm.name.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data: {
          name,
          description: editForm.description.trim() || null,
          color: editForm.color.trim() || null,
        },
      });
      toast.success(`${name} category updated`);
      setEditingCategory(null);
      setEditForm(initialFormState);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update category');
    }
  };

  const handleConfirmDelete = async () => {
    if (!isDeleteDialogOpen || !deleteState.category) {
      return;
    }
    try {
      const payload = deleteState.targetCategoryId
        ? { targetCategoryId: deleteState.targetCategoryId }
        : undefined;
      await deleteCategory.mutateAsync({ id: deleteState.category.id, data: payload });
      toast.success(`${deleteState.category.name} category deleted`);
      setIsDeleteDialogOpen(false);
      setDeleteState({ category: null, targetCategoryId: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Manage Categories</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add new categories, rename existing ones, or remove unused categories.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="p-6 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Add Category
            </h3>
            <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Category name"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                className="sm:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={addForm.description}
                onChange={(e) => setAddForm((prev) => ({ ...prev, description: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="#color"
                  value={addForm.color}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={createCategory.isPending}
                  className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>

          <section className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Existing Categories
            </h3>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories found. Add your first category above.</p>
            ) : (
              <ul className="space-y-3">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="p-4 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0"
                  >
                    <div>
                      <div className="flex items-center space-x-3">
                        {category.color && (
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setIsDeleteDialogOpen(true);
                          setDeleteState({ category, targetCategoryId: '' });
                        }}
                        className="inline-flex items-center px-3 py-2 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {editingCategory && (
          <div className="border-t bg-gray-50">
            <form onSubmit={handleUpdateCategory} className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Edit Category
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Category name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="#color"
                  value={editForm.color}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setEditForm(initialFormState);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCategory.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isDeleteDialogOpen && deleteState.category && (
          <div className="border-t bg-white">
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Delete Category
              </h3>
              <p className="text-sm text-gray-600">
                Removing <span className="font-medium">{deleteState.category.name}</span> will delete the
                category. If it contains items, choose another category to move them into first.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={deleteState.targetCategoryId}
                  onChange={(e) =>
                    setDeleteState((prev) => ({ ...prev, targetCategoryId: e.target.value }))
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Do not reassign items</option>
                  {selectableReassignmentTargets.map((category) => (
                    <option key={category.id} value={category.id}>
                      Move to: {category.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      setDeleteState({ category: null, targetCategoryId: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteCategory.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteCategory.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
