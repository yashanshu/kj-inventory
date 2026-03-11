import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, LogOut, Menu, X, ShoppingCart, UtensilsCrossed, Store, Link2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useStores } from '../hooks/useStores';
import { useStoreFilterStore } from '../store/storeFilterStore';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: stores = [] } = useStores();
  const { selectedStoreId, setSelectedStoreId } = useStoreFilterStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-50)', display: 'flex' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.5)',
            zIndex: 40, backdropFilter: 'blur(2px)',
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 w-60 flex flex-col lg:translate-x-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 232 }}
      >
        {/* Logo */}
        <div style={{
          padding: '1.25rem 1.25rem 0.875rem',
          borderBottom: '1px solid rgb(255 255 255 / 0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Package style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>KJ Inventory</div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', lineHeight: 1 }}>Restaurant Ops</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            style={{ color: '#64748b', padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Nav section label */}
        <div style={{ padding: '1.25rem 1.25rem 0.5rem' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569' }}>
            Main Menu
          </span>
        </div>

        {/* Store picker */}
        {stores.length > 1 && (
          <div style={{ padding: '0 0.75rem 0.75rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgb(255 255 255 / 0.04)',
              borderRadius: 8,
              border: '1px solid rgb(255 255 255 / 0.08)',
            }}>
              <Store style={{ width: 13, height: 13, color: '#64748b', flexShrink: 0 }} />
              <select
                value={selectedStoreId ?? ''}
                onChange={(e) => setSelectedStoreId(e.target.value || null)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#94a3b8', fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                <option value="">All Stores</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon className="nav-icon" style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{item.name}</span>
                {isActive && (
                  <span style={{
                    marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                    background: '#818cf8', flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <>
              <div style={{ padding: '0.75rem 0.75rem 0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#475569' }}>
                  Admin
                </span>
              </div>
              {[
                { name: 'Stores', href: '/admin/stores', icon: Store },
                { name: 'Bindings', href: '/admin/bindings', icon: Link2 },
              ].map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-nav-item${isActive ? ' active' : ''}`}
                  >
                    <item.icon className="nav-icon" style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>{item.name}</span>
                    {isActive && (
                      <span style={{
                        marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                        background: '#818cf8', flexShrink: 0,
                      }} />
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div style={{
          padding: '0.75rem',
          borderTop: '1px solid rgb(255 255 255 / 0.06)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.625rem 0.75rem',
            borderRadius: 10,
            marginBottom: 4,
            background: 'rgb(255 255 255 / 0.04)',
          }}>
            <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.6875rem' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.role?.toLowerCase()}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.5rem 0.75rem',
              width: '100%',
              borderRadius: 8,
              background: 'none', border: 'none',
              fontSize: '0.8125rem', fontWeight: 500, color: '#64748b',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgb(255 255 255 / 0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 0 }} className="lg:ml-[232px]">
        {/* Mobile top bar */}
        <div
          className="lg:hidden"
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            background: 'var(--neutral-0)',
            borderBottom: '1px solid var(--neutral-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--neutral-600)', cursor: 'pointer', padding: 4 }}
          >
            <Menu style={{ width: 20, height: 20 }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 24, height: 24,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Package style={{ width: 12, height: 12, color: '#fff' }} />
            </div>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--neutral-900)' }}>KJ Inventory</span>
          </div>
          <div style={{ width: 28 }} />
        </div>

        {/* Page content */}
        <main style={{ padding: '2rem 1.75rem', maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
