import { useState } from 'react';
import { Link2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useBindings, useCreateBinding, useUpdateBinding, useDeleteBinding } from '../hooks/useStores';
import { useStores } from '../hooks/useStores';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

const PLATFORM_CONFIG: Record<string, { bg: string; text: string }> = {
  swiggy: { bg: 'rgb(234 88 12 / 0.08)', text: '#c2410c' },
  zomato: { bg: 'rgb(220 38 38 / 0.08)', text: '#991b1b' },
};

export function PlatformBindingsPage() {
  const { user } = useAuthStore();
  const { data: bindings = [], isLoading } = useBindings();
  const { data: stores = [] } = useStores();
  const createBinding = useCreateBinding();
  const updateBinding = useUpdateBinding();
  const deleteBinding = useDeleteBinding();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ storeId: '', platform: 'swiggy', restaurantId: '', restaurantName: '' });
  const [editForm, setEditForm] = useState({ restaurantName: '', isActive: true });

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  const storeMap = Object.fromEntries(stores.map(s => [s.id, s.name]));

  const handleCreate = async () => {
    if (!form.storeId || !form.restaurantId) {
      toast.error('Store and restaurant ID are required');
      return;
    }
    try {
      await createBinding.mutateAsync({
        storeId: form.storeId,
        platform: form.platform,
        restaurantId: form.restaurantId,
        restaurantName: form.restaurantName || undefined,
      });
      toast.success('Binding created');
      setShowCreate(false);
      setForm({ storeId: '', platform: 'swiggy', restaurantId: '', restaurantName: '' });
    } catch {
      toast.error('Failed to create binding');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateBinding.mutateAsync({ id, data: { restaurantName: editForm.restaurantName || undefined, isActive: editForm.isActive } });
      toast.success('Binding updated');
      setEditingId(null);
    } catch {
      toast.error('Failed to update binding');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this binding?')) return;
    try {
      await deleteBinding.mutateAsync(id);
      toast.success('Binding deleted');
    } catch {
      toast.error('Failed to delete binding');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="page-header">
        <div>
          <h1 className="text-page-title">Platform Bindings</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: 4 }}>
            Link Swiggy/Zomato restaurant IDs to stores
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus style={{ width: 14, height: 14 }} />
          Add Binding
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>New Binding</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <select className="form-input" value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} style={{ flex: '1 1 180px' }}>
              <option value="">Select Store</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="form-input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={{ flex: '0 1 140px' }}>
              <option value="swiggy">Swiggy</option>
              <option value="zomato">Zomato</option>
            </select>
            <input className="form-input" placeholder="Restaurant ID" value={form.restaurantId} onChange={e => setForm(f => ({ ...f, restaurantId: e.target.value }))} style={{ flex: '1 1 200px' }} />
            <input className="form-input" placeholder="Restaurant Name (optional)" value={form.restaurantName} onChange={e => setForm(f => ({ ...f, restaurantName: e.target.value }))} style={{ flex: '1 1 200px' }} />
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={createBinding.isPending}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Loading…</div>
        ) : bindings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Link2 style={{ width: 32, height: 32, color: 'var(--neutral-300)', margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--neutral-500)' }}>No bindings yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Restaurant ID</th>
                <th>Restaurant Name</th>
                <th>Store</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bindings.map(b => {
                const pc = PLATFORM_CONFIG[b.platform] || { bg: 'var(--neutral-100)', text: 'var(--neutral-600)' };
                return (
                  <tr key={b.id}>
                    <td>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: 99, background: pc.bg, color: pc.text, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {b.platform}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{b.restaurantId}</td>
                    <td>
                      {editingId === b.id ? (
                        <input className="form-input" value={editForm.restaurantName} onChange={e => setEditForm(f => ({ ...f, restaurantName: e.target.value }))} style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} />
                      ) : (
                        b.restaurantName || <span style={{ color: 'var(--neutral-400)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--neutral-600)', fontSize: '0.875rem' }}>
                      {storeMap[b.storeId] || b.storeId}
                    </td>
                    <td>
                      {editingId === b.id ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} />
                          Active
                        </label>
                      ) : (
                        <span className={`badge ${b.isActive ? 'badge-success' : 'badge-neutral'}`}>
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingId === b.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(b.id)} disabled={updateBinding.isPending}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(b.id); setEditForm({ restaurantName: b.restaurantName || '', isActive: b.isActive }); }} title="Edit">
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(b.id)} title="Delete">
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
