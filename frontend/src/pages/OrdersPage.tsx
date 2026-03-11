import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, RefreshCw, ShoppingBag } from 'lucide-react';
import { useOrders, useOrderStats } from '../hooks/useOrders';
import { ordersService, type Order } from '../services/orders';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

const PLATFORM_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  swiggy: { bg: 'rgb(234 88 12 / 0.08)', text: '#c2410c', dot: '#f97316' },
  zomato: { bg: 'rgb(220 38 38 / 0.08)', text: '#991b1b', dot: '#ef4444' },
};

const STATUS_CONFIG: Record<string, { cls: string }> = {
  ordered:   { cls: 'badge-info' },
  placed:    { cls: 'badge-info' },
  confirmed: { cls: 'badge-success' },
  delivered: { cls: 'badge-success' },
  cancelled: { cls: 'badge-neutral' },
};

function OrderRow({ order }: { order: Order }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = useMemo(() => ordersService.parseItems(order.itemsJson), [order.itemsJson]);
  const platformCfg = PLATFORM_CONFIG[order.platform] || { bg: 'var(--neutral-100)', text: 'var(--neutral-600)', dot: 'var(--neutral-400)' };
  const statusCls = (STATUS_CONFIG[order.status.toLowerCase()] || STATUS_CONFIG.ordered)?.cls ?? 'badge-neutral';

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isExpanded
              ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--neutral-400)', flexShrink: 0 }} />
              : <ChevronDown style={{ width: 14, height: 14, color: 'var(--neutral-400)', flexShrink: 0 }} />}
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
              #{order.externalOrderId.slice(-8)}
            </span>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 600,
              padding: '0.125rem 0.375rem', borderRadius: 99,
              background: order.storeId ? 'rgb(34 197 94 / 0.1)' : 'rgb(234 179 8 / 0.1)',
              color: order.storeId ? '#15803d' : '#a16207',
            }}>
              {order.storeId ? 'Bound' : 'Unbound'}
            </span>
          </div>
        </td>
        <td style={{ color: 'var(--neutral-500)', fontSize: '0.8125rem' }}>
          {formatDateTime(order.orderDate)}
        </td>
        <td>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3125rem',
            padding: '0.1875rem 0.625rem', borderRadius: 99,
            background: platformCfg.bg, color: platformCfg.text,
            fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: platformCfg.dot }} />
            {order.platform}
          </span>
        </td>
        <td style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>
          {order.customerName || <span style={{ color: 'var(--neutral-400)' }}>—</span>}
        </td>
        <td style={{ color: 'var(--neutral-500)', fontSize: '0.8125rem' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </td>
        <td style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
          {formatCurrency(order.totalAmount)}
        </td>
        <td>
          <span className={`badge ${statusCls}`} style={{ textTransform: 'capitalize' }}>
            {order.status}
          </span>
        </td>
      </tr>

      {isExpanded && items.length > 0 && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <div style={{
              background: 'var(--neutral-50)',
              borderBottom: '1px solid var(--neutral-100)',
              padding: '0.875rem 1.25rem 0.875rem 2.75rem',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-500)', marginBottom: '0.5rem' }}>
                Order Items
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3125rem' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '0.875rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                        background: 'var(--neutral-200)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6875rem', fontWeight: 700, color: 'var(--neutral-600)',
                      }}>
                        {item.quantity}
                      </span>
                      <span style={{ color: 'var(--neutral-700)' }}>{item.name}</span>
                    </div>
                    <span style={{ color: 'var(--neutral-500)', fontWeight: 500 }}>
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function OrdersPage() {
  const [platform, setPlatform] = useState<string>('');
  const [search, setSearch] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data: orders = [], isLoading, refetch, isFetching } = useOrders({
    platform: platform || undefined,
    limit,
    offset,
  });
  const { data: stats } = useOrderStats();

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.customerName?.toLowerCase().includes(q) ||
      o.externalOrderId.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">Orders</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: 4 }}>
            Swiggy & Zomato orders
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn btn-secondary"
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <StatCard label="Total Orders" value={String(stats.totalOrders)} />
          <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
          <StatCard
            label="Swiggy"
            value={`${stats.swiggyOrders} orders`}
            sub={formatCurrency(stats.swiggyRevenue)}
            accent="#f97316"
            accentBg="rgb(249 115 22 / 0.06)"
          />
          <StatCard
            label="Zomato"
            value={`${stats.zomatoOrders} orders`}
            sub={formatCurrency(stats.zomatoRevenue)}
            accent="#ef4444"
            accentBg="rgb(239 68 68 / 0.06)"
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="input-icon-wrap" style={{ flex: '1 1 240px' }}>
          <Search className="input-icon" style={{ width: 15, height: 15 }} />
          <input
            type="text"
            placeholder="Search by customer or order ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setOffset(0); }}
          className="form-input"
          style={{ width: 'auto', minWidth: 160, cursor: 'pointer' }}
        >
          <option value="">All Platforms</option>
          <option value="swiggy">Swiggy</option>
          <option value="zomato">Zomato</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem',
          }}>
            <RefreshCw style={{ width: 20, height: 20, color: 'var(--neutral-400)' }} className="animate-spin" />
            <span style={{ fontSize: '0.875rem', color: 'var(--neutral-500)' }}>Loading orders…</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '3.5rem 1rem', gap: '0.75rem',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: 'var(--neutral-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingBag style={{ width: 22, height: 22, color: 'var(--neutral-400)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--neutral-700)' }}>No orders found</p>
              {search && <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-400)', marginTop: 4 }}>Try a different search</p>}
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--neutral-100)',
              background: 'var(--neutral-50)',
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)' }}>
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={orders.length < limit}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, accentBg }: {
  label: string; value: string; sub?: string;
  accent?: string; accentBg?: string;
}) {
  return (
    <div className="metric-card" style={{
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      background: accentBg || undefined,
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--neutral-500)', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--neutral-900)', lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}
