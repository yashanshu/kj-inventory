import { Package, AlertTriangle, Activity, TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardMetrics, useLowStockItems, useRecentMovements } from '../hooks/useDashboard';
import { Link } from 'react-router-dom';
import { MetricCardSkeleton, ListSkeleton } from '../components/LoadingSkeleton';

export function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  const { data: recentMovements, isLoading: movementsLoading } = useRecentMovements(5);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page header */}
      <div>
        <h1 className="text-page-title">Dashboard</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', marginTop: 4 }}>
          Overview of your inventory health
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {metricsLoading ? (
          <>
            <MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Items"
              value={metrics?.totalItems || 0}
              icon={Package}
              accent="#6366f1"
              accentBg="rgb(99 102 241 / 0.08)"
            />
            <MetricCard
              title="Low Stock"
              value={metrics?.lowStockCount || 0}
              icon={AlertTriangle}
              accent="#f59e0b"
              accentBg="rgb(245 158 11 / 0.08)"
              urgency={metrics?.lowStockCount ? 'warning' : undefined}
            />
            <MetricCard
              title="Out of Stock"
              value={metrics?.outOfStockCount || 0}
              icon={AlertTriangle}
              accent="#ef4444"
              accentBg="rgb(239 68 68 / 0.08)"
              urgency={metrics?.outOfStockCount ? 'danger' : undefined}
            />
            <MetricCard
              title="Total Value"
              value={metrics?.totalValue || 0}
              icon={TrendingUp}
              accent="#10b981"
              accentBg="rgb(16 185 129 / 0.08)"
              isMonetary
            />
          </>
        )}
      </div>

      {/* Two-column section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Low Stock Items */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '1.125rem 1.375rem',
            borderBottom: '1px solid var(--neutral-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgb(245 158 11 / 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b' }} />
              </div>
              <span className="text-section-title">Low Stock</span>
            </div>
            {!lowStockLoading && lowStockItems && lowStockItems.length > 0 && (
              <Link
                to="/inventory?lowStock=true"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.8125rem', fontWeight: 500,
                  color: 'var(--brand-600)', textDecoration: 'none',
                }}
              >
                View all <ArrowRight style={{ width: 12, height: 12 }} />
              </Link>
            )}
          </div>

          <div style={{ padding: '0.5rem 0' }}>
            {lowStockLoading ? (
              <div style={{ padding: '0 1.375rem' }}>
                <ListSkeleton items={3} />
              </div>
            ) : lowStockItems && lowStockItems.length > 0 ? (
              lowStockItems.slice(0, 5).map((item) => {
                const pct = item.minimumThreshold > 0
                  ? Math.min(100, (item.currentStock / item.minimumThreshold) * 100)
                  : 100;
                const isOut = item.currentStock === 0;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6875rem 1.375rem',
                      borderBottom: '1px solid var(--neutral-50)',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, marginRight: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--neutral-800)', marginBottom: 4 }}>
                        {item.name}
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--neutral-100)', overflow: 'hidden', width: '100%' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: 99,
                          background: isOut ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isOut ? '#ef4444' : '#f59e0b' }}>
                        {item.currentStock} {item.unit}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--neutral-400)', marginTop: 2 }}>
                        min {item.minimumThreshold}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '2.5rem 1rem', gap: '0.75rem',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package style={{ width: 20, height: 20, color: 'var(--neutral-400)' }} />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)', textAlign: 'center' }}>
                  All items are well stocked
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '1.125rem 1.375rem',
            borderBottom: '1px solid var(--neutral-100)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgb(99 102 241 / 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity style={{ width: 14, height: 14, color: 'var(--brand-500)' }} />
            </div>
            <span className="text-section-title">Recent Activity</span>
          </div>

          <div style={{ padding: '0.5rem 0' }}>
            {movementsLoading ? (
              <div style={{ padding: '0 1.375rem' }}>
                <ListSkeleton items={5} />
              </div>
            ) : recentMovements && recentMovements.length > 0 ? (
              recentMovements.map((movement) => {
                const isIn = movement.movementType === 'IN';
                const isOut = movement.movementType === 'OUT';
                return (
                  <div
                    key={movement.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.6875rem 1.375rem',
                      borderBottom: '1px solid var(--neutral-50)',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isIn ? 'var(--status-success-bg)' : isOut ? 'var(--status-danger-bg)' : 'var(--status-info-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isIn ? (
                        <ArrowUpRight style={{ width: 13, height: 13, color: '#166534' }} />
                      ) : isOut ? (
                        <ArrowDownRight style={{ width: 13, height: 13, color: '#991b1b' }} />
                      ) : (
                        <Activity style={{ width: 13, height: 13, color: '#1e40af' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--neutral-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {movement.item?.name || 'Unknown Item'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: 2 }}>
                        {new Date(movement.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit', hour12: true,
                        })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0,
                      color: isIn ? '#166534' : isOut ? '#991b1b' : '#1e40af',
                    }}>
                      {isIn ? '+' : isOut ? '−' : ''}{movement.quantity}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '2.5rem 1rem', gap: '0.75rem',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Activity style={{ width: 20, height: 20, color: 'var(--neutral-400)' }} />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)' }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  accentBg: string;
  isMonetary?: boolean;
  urgency?: 'warning' | 'danger';
}

function MetricCard({ title, value, icon: Icon, accent, accentBg, isMonetary = false, urgency }: MetricCardProps) {
  const formattedValue = isMonetary
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value)
    : value.toLocaleString();

  return (
    <div className="metric-card card-hover" style={{ position: 'relative', overflow: 'hidden' }}>
      {urgency && value > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: urgency === 'danger' ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--neutral-500)', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 8 }}>
            {title}
          </p>
          <p style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--neutral-900)', lineHeight: 1.1 }}>
            {formattedValue}
          </p>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 18, height: 18, color: accent }} />
        </div>
      </div>
    </div>
  );
}
