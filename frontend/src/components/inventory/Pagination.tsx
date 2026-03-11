import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({ currentPage, pageSize, totalItems, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1.25rem',
      borderTop: '1px solid var(--neutral-100)',
      background: 'var(--neutral-50)',
      gap: '0.75rem', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)' }}>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="form-input"
          style={{ width: 'auto', padding: '0.3125rem 0.625rem', fontSize: '0.8125rem' }}
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)' }}>
          {totalItems === 0 ? 'No items' : `${startItem}–${endItem} of ${totalItems}`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-secondary btn-icon"
          style={{ padding: '0.3125rem' }}
        >
          <ChevronLeft style={{ width: 15, height: 15 }} />
        </button>

        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '0.125rem' }}>
          {getPageNumbers(currentPage, totalPages).map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`e-${idx}`} style={{ padding: '0 0.375rem', fontSize: '0.8125rem', color: 'var(--neutral-400)' }}>…</span>
              );
            }
            const isActive = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onPageChange(Number(page))}
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--brand-600)' : 'none',
                  color: isActive ? '#fff' : 'var(--neutral-600)',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => !isActive && ((e.currentTarget as HTMLButtonElement).style.background = 'var(--neutral-100)')}
                onMouseLeave={e => !isActive && ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
              >
                {page}
              </button>
            );
          })}
        </div>

        <span className="sm:hidden" style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', padding: '0 0.5rem' }}>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="btn btn-secondary btn-icon"
          style={{ padding: '0.3125rem' }}
        >
          <ChevronRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}
