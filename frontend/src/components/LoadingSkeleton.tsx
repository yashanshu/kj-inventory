// Reusable loading skeleton components

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse-slow"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(6)].map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded animate-pulse-slow" style={{ animationDelay: `${colIndex * 100}ms` }}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3 animate-pulse-slow"></div>
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse-slow"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse-slow"></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse-slow"></div>
            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse-slow"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse-slow"></div>
        </div>
      ))}
    </div>
  );
}

export function CategoryPillsSkeleton() {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex-shrink-0 h-10 w-24 bg-gray-200 rounded-full animate-pulse-slow" style={{ animationDelay: `${i * 100}ms` }}></div>
      ))}
    </div>
  );
}
