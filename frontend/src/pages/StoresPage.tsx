import { useState } from 'react';
import { Store, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { useStores, useCreateStore, useUpdateStore, useDeleteStore } from '../hooks/useStores';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export function StoresPage() {
  const { user } = useAuthStore();
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  const { data: stores = [], isLoading } = useStores();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', isPrimary: false });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    try {
      await createStore.mutateAsync(form);
      toast.success('Store created');
      setShowCreate(false);
      setForm({ name: '', code: '', isPrimary: false });
    } catch {
      toast.error('Failed to create store');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateStore.mutateAsync({ id, data: { name: form.name, code: form.code, isPrimary: form.isPrimary } });
      toast.success('Store updated');
      setEditingId(null);
    } catch {
      toast.error('Failed to update store');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this store?')) return;
    try {
      await deleteStore.mutateAsync(id);
      toast.success('Store deactivated');
    } catch {
      toast.error('Failed to deactivate store');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="page-header">
        <div>
          <h1 className="text-page-title">Stores</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: 4 }}>
            Manage organization stores
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setForm({ name: '', code: '', isPrimary: false }); }}>
          <Plus style={{ width: 14, height: 14 }} />
          Add Store
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>New Store</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input className="form-input" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: '1 1 200px' }} />
            <input className="form-input" placeholder="Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={{ flex: '0 1 140px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--neutral-600)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
              Primary
            </label>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={createStore.isPending}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Loading…</div>
        ) : stores.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Store style={{ width: 32, height: 32, color: 'var(--neutral-300)', margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--neutral-500)' }}>No stores yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Primary</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(store => (
                <tr key={store.id}>
                  <td>
                    {editingId === store.id ? (
                      <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} />
                    ) : (
                      <span style={{ fontWeight: 500 }}>{store.name}</span>
                    )}
                  </td>
                  <td>
                    {editingId === store.id ? (
                      <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: 100 }} />
                    ) : (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>{store.code}</span>
                    )}
                  </td>
                  <td>
                    {store.isPrimary && (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Star style={{ width: 10, height: 10 }} /> Primary
                      </span>
                    )}
                    {editingId === store.id && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                        Set primary
                      </label>
                    )}
                  </td>
                  <td>
                    {editingId === store.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(store.id)} disabled={updateStore.isPending}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setEditingId(store.id); setForm({ name: store.name, code: store.code, isPrimary: store.isPrimary }); }}
                          title="Edit"
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(store.id)} title="Deactivate">
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
