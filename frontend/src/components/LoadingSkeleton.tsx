const shimmer = {
  background: 'var(--neutral-200)',
  borderRadius: 6,
} as const;

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i}>
                  <div style={{ ...shimmer, height: 12, width: '60%' }} className="animate-pulse-slow" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[...Array(6)].map((_, colIndex) => (
                  <td key={colIndex}>
                    <div
                      style={{ ...shimmer, height: 14, width: colIndex === 0 ? '70%' : '50%' }}
                      className="animate-pulse-slow"
                    />
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
    <div className="metric-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmer, height: 11, width: 80, marginBottom: 12 }} className="animate-pulse-slow" />
          <div style={{ ...shimmer, height: 28, width: 64 }} className="animate-pulse-slow" />
        </div>
        <div style={{ ...shimmer, width: 40, height: 40, borderRadius: 10 }} className="animate-pulse-slow" />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0.5rem 0' }}>
      {[...Array(items)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...shimmer, height: 13, width: `${48 + (i % 3) * 16}%`, marginBottom: 6 }} className="animate-pulse-slow" />
            <div style={{ ...shimmer, height: 10, width: '35%' }} className="animate-pulse-slow" />
          </div>
          <div style={{ ...shimmer, height: 22, width: 52, borderRadius: 99 }} className="animate-pulse-slow" />
        </div>
      ))}
    </div>
  );
}

export function CategoryPillsSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', overflow: 'hidden' }}>
      {[80, 64, 96, 72, 56].map((w, i) => (
        <div
          key={i}
          style={{ ...shimmer, height: 28, width: w, borderRadius: 99, flexShrink: 0 }}
          className="animate-pulse-slow"
        />
      ))}
    </div>
  );
}
