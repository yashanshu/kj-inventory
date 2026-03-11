import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menuService, type MenuOffer, type MenuCategory, type MenuItem } from '../services/menu';
import { ChevronDown, ChevronRight, Tag, Leaf, Beef, Clock, ChevronsUpDown } from 'lucide-react';

export function MenuPage() {
  const { data: menus, isLoading, error } = useQuery({
    queryKey: ['menus'],
    queryFn: () => menuService.getMenus(),
  });

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (menus && menus.length > 0 && !selectedRestaurantId) {
      setSelectedRestaurantId(menus[0].restaurantId);
      const names = menus[0]
        ? menuService.parseCategories(menus[0].categoriesJson).slice(0, 2).map(c => c.name)
        : [];
      setExpandedCategories(new Set(names));
    }
  }, [menus, selectedRestaurantId]);

  const selectedMenu = menus?.find(m => m.restaurantId === selectedRestaurantId);
  const offers = selectedMenu ? menuService.parseOffers(selectedMenu.offersJson) : [];
  const categories = selectedMenu ? menuService.parseCategories(selectedMenu.categoriesJson) : [];

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ height: 28, background: 'var(--neutral-200)', borderRadius: 6, width: 160 }} className="animate-pulse-slow" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 84, background: 'var(--neutral-200)', borderRadius: 12 }} className="animate-pulse-slow" />
          ))}
        </div>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 56, background: 'var(--neutral-200)', borderRadius: 10 }} className="animate-pulse-slow" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: '#ef4444', fontWeight: 500 }}>Failed to load menu data</p>
        <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem', marginTop: 8 }}>Please try again later</p>
      </div>
    );
  }

  if (!menus || menus.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1rem', gap: '0.875rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--neutral-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock style={{ width: 24, height: 24, color: 'var(--neutral-400)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--neutral-700)' }}>No menu data yet</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: 4 }}>Fetched daily at 6 PM IST</p>
        </div>
      </div>
    );
  }

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const vegItems = categories.reduce((s, c) => s + c.items.filter(i => i.isVeg).length, 0);
  const inStockItems = categories.reduce((s, c) => s + c.items.filter(i => i.inStock).length, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">Restaurant Menu</h1>
          {selectedMenu && (
            <>
              <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: 4 }}>
                Updated{' '}
                {new Date(selectedMenu.fetchedAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                })}
              </p>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600,
                padding: '0.125rem 0.375rem', borderRadius: 99,
                background: selectedMenu?.storeId ? 'rgb(34 197 94 / 0.1)' : 'rgb(234 179 8 / 0.1)',
                color: selectedMenu?.storeId ? '#15803d' : '#a16207',
              }}>
                {selectedMenu?.storeId ? 'Bound' : 'Unbound'}
              </span>
            </>
          )}
        </div>
        {menus.length > 1 && (
          <select
            value={selectedRestaurantId || ''}
            onChange={(e) => { setSelectedRestaurantId(e.target.value); setExpandedCategories(new Set()); }}
            className="form-input"
            style={{ width: 'auto', minWidth: 180 }}
          >
            {menus.map(m => (
              <option key={m.restaurantId} value={m.restaurantId}>
                {m.restaurantName || `Restaurant ${m.restaurantId}`}{m.storeId ? '' : ' (Unbound)'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '1rem' }}>
        <MenuStat label="Total Items" value={totalItems} color="var(--brand-600)" />
        <MenuStat label="Categories" value={categories.length} color="#8b5cf6" />
        <MenuStat label="Veg Items" value={vegItems} color="#16a34a" />
        <MenuStat label="In Stock" value={inStockItems} color="#0284c7" />
      </div>

      {/* Offers */}
      {offers.length > 0 && (
        <div>
          <div style={{ marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag style={{ width: 15, height: 15, color: '#f59e0b' }} />
            <span className="text-section-title">Active Offers</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>({offers.length})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '0.75rem' }}>
            {offers.map((offer, idx) => <OfferCard key={idx} offer={offer} />)}
          </div>
        </div>
      )}

      {/* Menu Categories */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <span className="text-section-title">Menu ({categories.length})</span>
          <button
            onClick={() => {
              if (expandedCategories.size === categories.length) {
                setExpandedCategories(new Set());
              } else {
                setExpandedCategories(new Set(categories.map(c => c.name)));
              }
            }}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--neutral-500)' }}
          >
            <ChevronsUpDown style={{ width: 13, height: 13 }} />
            {expandedCategories.size === categories.length ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {categories.map((category) => (
            <CategorySection
              key={category.name}
              category={category}
              isExpanded={expandedCategories.has(category.name)}
              onToggle={() => toggleCategory(category.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="metric-card">
      <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', color }}>{value}</p>
    </div>
  );
}

function OfferCard({ offer }: { offer: MenuOffer }) {
  return (
    <div style={{
      padding: '0.875rem 1rem',
      borderRadius: 'var(--radius-md)',
      border: '1px solid #fde68a',
      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: 'rgb(245 158 11 / 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Tag style={{ width: 14, height: 14, color: '#b45309' }} />
      </div>
      <div>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#78350f' }}>{offer.header}</p>
        {offer.couponCode && (
          <span style={{
            display: 'inline-block', marginTop: 4,
            padding: '0.125rem 0.5rem',
            background: '#fff', border: '1px dashed #f59e0b',
            borderRadius: 4,
            fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem',
            fontWeight: 600, color: '#d97706',
          }}>
            {offer.couponCode}
          </span>
        )}
        {offer.description && (
          <p style={{ fontSize: '0.8125rem', color: '#92400e', marginTop: 4 }}>{offer.description}</p>
        )}
      </div>
    </div>
  );
}

function CategorySection({ category, isExpanded, onToggle }: {
  category: MenuCategory; isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1.125rem',
          background: 'none', border: 'none', cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--neutral-50)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {isExpanded
            ? <ChevronDown style={{ width: 15, height: 15, color: 'var(--neutral-400)', flexShrink: 0 }} />
            : <ChevronRight style={{ width: 15, height: 15, color: 'var(--neutral-400)', flexShrink: 0 }} />}
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--neutral-800)' }}>{category.name}</span>
          <span style={{
            fontSize: '0.75rem', fontWeight: 500,
            padding: '0.125rem 0.5rem', borderRadius: 99,
            background: 'var(--neutral-100)', color: 'var(--neutral-500)',
          }}>
            {category.itemCount}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--neutral-100)' }}>
          {category.items.map((item, idx) => (
            <MenuItemRow key={idx} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
        padding: '0.75rem 1.125rem',
        borderBottom: '1px solid var(--neutral-50)',
        opacity: item.inStock ? 1 : 0.45,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => item.inStock && ((e.currentTarget as HTMLDivElement).style.background = 'var(--neutral-50)')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = '')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', marginBottom: 3 }}>
          {item.isVeg ? (
            <Leaf style={{ width: 13, height: 13, color: '#16a34a', flexShrink: 0 }} />
          ) : (
            <Beef style={{ width: 13, height: 13, color: '#dc2626', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--neutral-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
          {!item.inStock && (
            <span className="badge badge-danger" style={{ flexShrink: 0 }}>Out of stock</span>
          )}
        </div>
        {item.description && (
          <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', lineHeight: 1.45 }} className="truncate-2">
            {item.description}
          </p>
        )}
        {item.variants.length > 0 && (
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {item.variants.map((v, vi) => (
              <span key={vi} style={{
                fontSize: '0.6875rem', color: 'var(--neutral-500)',
                padding: '0.0625rem 0.375rem',
                background: 'var(--neutral-100)', borderRadius: 4,
              }}>
                {v.groupName}: {v.options.map(o => `${o.name} ₹${o.price}`).join(', ')}
              </span>
            ))}
          </div>
        )}
      </div>
      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--neutral-900)', flexShrink: 0 }}>
        ₹{item.price.toFixed(0)}
      </span>
    </div>
  );
}
