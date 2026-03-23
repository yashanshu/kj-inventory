import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPLReport } from '../api/reports';
import { getCalendarSummary } from '../api/expenses';
import { formatINR } from '../utils/currency';
import { firstDayOfMonth, today } from '../utils/dates';
import QuickAddFab from '../components/expenses/QuickAddFab';
import MonthGrid from '../components/calendar/MonthGrid';
import DayPanel from '../components/calendar/DayPanel';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function DashboardPage() {
  const now = new Date();
  const from = firstDayOfMonth(now.getFullYear(), now.getMonth() + 1);
  const to = today();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: pl } = useQuery({
    queryKey: ['pl', from, to],
    queryFn: () => getPLReport(from, to),
  });

  const { data: cal } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => getCalendarSummary(year, month),
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page__header">
        <div>
          <h1 className="page__title">Command Center</h1>
          <p className="page__subtitle">
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()} · fiscal overview
          </p>
        </div>
      </header>

      {/* ── KPI bento grid ── */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Monthly Gross</span>
            <span className="metric-card__badge metric-card__badge--up">MTD</span>
          </div>
          <div className="metric-card__value">{pl ? formatINR(pl.total_paise) : '—'}</div>
          <div className="metric-card__sub">total expenses this month</div>
          <span className="metric-card__bg-icon">₹</span>
        </div>

        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">GST Input Credit</span>
            <span className="metric-card__badge metric-card__badge--stable">Est.</span>
          </div>
          <div className="metric-card__value">{pl ? formatINR(pl.total_gst_paise) : '—'}</div>
          <div className="metric-card__sub">claimable input tax</div>
          <span className="metric-card__bg-icon">%</span>
        </div>

        <div className="metric-card">
          <div className="metric-card__header">
            <span className="metric-card__label">Net Position</span>
            <span className="metric-card__badge metric-card__badge--neutral">Base</span>
          </div>
          <div className="metric-card__value">{pl ? formatINR(pl.net_paise) : '—'}</div>
          <div className="metric-card__sub">spend excl. GST</div>
          <span className="metric-card__bg-icon">#</span>
        </div>
      </div>

      {/* ── Main content: calendar + category side ── */}
      <div className="dashboard-grid">
        {/* Fiscal calendar */}
        <div className="calendar-container">
          <div className="calendar-header">
            <div>
              <div className="calendar-title">Fiscal Calendar</div>
              <div className="calendar-subtitle">
                {MONTH_NAMES[month - 1]} {year} · click a day for details
              </div>
            </div>
            <div className="calendar-nav-group">
              <button className="btn btn--secondary btn--icon btn--sm" onClick={prevMonth} aria-label="Previous month">‹</button>
              <button className="btn btn--secondary btn--sm" onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}>
                Today
              </button>
              <button className="btn btn--secondary btn--icon btn--sm" onClick={nextMonth} aria-label="Next month">›</button>
            </div>
          </div>

          {cal ? (
            <>
              <MonthGrid
                year={year}
                month={month}
                days={cal.days}
                weekTotals={cal.week_totals}
                monthTotal={cal.month_total_paise}
                onDayClick={setSelectedDate}
              />
              {/* Legend */}
              <div className="calendar-legend">
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--locked" />
                  Locked
                </div>
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--pending" />
                  Pending Review
                </div>
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--entries" />
                  Has Entries
                </div>
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--empty" />
                  Empty
                </div>
              </div>
            </>
          ) : (
            <div className="loading">Loading calendar…</div>
          )}
        </div>

        {/* Category breakdown side panel */}
        {pl && pl.by_category?.length > 0 && (
          <div className="dashboard-side">
            <div className="calendar-container" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="calendar-header" style={{ marginBottom: 'var(--sp-4)' }}>
                <div className="calendar-title" style={{ fontSize: '16px' }}>By Category</div>
              </div>
              <ul className="category-breakdown">
                {pl.by_category.map((c) => (
                  <li key={c.category_id} className="category-breakdown__row">
                    <span className="category-breakdown__name">{c.category_name || c.category_id}</span>
                    <span className="category-breakdown__amount">{formatINR(c.total_paise)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <div className="slide-panel-overlay" onClick={() => setSelectedDate(null)}>
          <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
            <DayPanel
              date={selectedDate}
              onClose={() => setSelectedDate(null)}
              onAddExpense={() => {}}
            />
          </div>
        </div>
      )}

      <QuickAddFab />
    </div>
  );
}
