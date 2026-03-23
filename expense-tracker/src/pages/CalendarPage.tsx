import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalendarSummary } from '../api/expenses';
import MonthGrid from '../components/calendar/MonthGrid';
import DayPanel from '../components/calendar/DayPanel';
import QuickAddFab from '../components/expenses/QuickAddFab';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => getCalendarSummary(year, month),
  });

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Journals</h1>
          <p className="page__subtitle">Day-by-day ledger view</p>
        </div>
      </header>

      <div className="calendar-container">
        <div className="calendar-header">
          <div>
            <div className="calendar-title">{MONTH_NAMES[month - 1]} {year}</div>
            <div className="calendar-subtitle">fiscal calendar · click a day to manage entries</div>
          </div>
          <div className="calendar-nav-group">
            <button className="btn btn--secondary btn--icon btn--sm" onClick={prevMonth} aria-label="Previous month">‹</button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
            >
              Today
            </button>
            <button className="btn btn--secondary btn--icon btn--sm" onClick={nextMonth} aria-label="Next month">›</button>
          </div>
        </div>

        {data ? (
          <>
            <MonthGrid
              year={year}
              month={month}
              days={data.days}
              weekTotals={data.week_totals}
              monthTotal={data.month_total_paise}
              onDayClick={setSelectedDate}
            />
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
