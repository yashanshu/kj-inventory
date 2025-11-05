import { Package, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { useDashboardMetrics, useLowStockItems, useRecentMovements } from '../hooks/useDashboard';
import { Link } from 'react-router-dom';
import { MetricCardSkeleton, ListSkeleton } from '../components/LoadingSkeleton';

export function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  const { data: recentMovements, isLoading: movementsLoading } = useRecentMovements(5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Items"
              value={metrics?.totalItems || 0}
              icon={Package}
              color="blue"
            />
            <MetricCard
              title="Low Stock"
              value={metrics?.lowStockCount || 0}
              icon={AlertTriangle}
              color="yellow"
            />
            <MetricCard
              title="Out of Stock"
              value={metrics?.outOfStockCount || 0}
              icon={AlertTriangle}
              color="red"
            />
            <MetricCard
              title="Total Value"
              value={metrics?.totalValue || 0}
              icon={TrendingUp}
              color="green"
              isMonetary
            />
          </>
        )}
      </div>

      {/* Low Stock Items */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Low Stock Items</h2>
          {!lowStockLoading && lowStockItems && lowStockItems.length > 0 && (
            <Link to="/inventory?lowStock=true" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          )}
        </div>
        {lowStockLoading ? (
          <ListSkeleton items={3} />
        ) : lowStockItems && lowStockItems.length > 0 ? (
          <div className="space-y-3">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${item.currentStock === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {item.currentStock} {item.unit}
                  </div>
                  <div className="text-sm text-gray-500">
                    Min: {item.minimumThreshold} {item.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Package className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">All items are well stocked!</p>
          </div>
        )}
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {movementsLoading ? (
          <ListSkeleton items={5} />
        ) : recentMovements && recentMovements.length > 0 ? (
          <div className="space-y-3">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <div className="font-medium text-gray-900">{movement.item?.name || 'Unknown Item'}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(movement.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  movement.movementType === 'IN'
                    ? 'bg-green-100 text-green-700'
                    : movement.movementType === 'OUT'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {movement.movementType} {movement.quantity}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Activity className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'yellow' | 'red' | 'green';
  isMonetary?: boolean;
}

function MetricCard({ title, value, icon: Icon, color, isMonetary = false }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };

  const formattedValue = isMonetary
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value)
    : value.toLocaleString();

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
