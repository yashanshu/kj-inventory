import type { CalendarDay, WeekTotal } from '../../types/ledgr';
import DayCell from './DayCell';
import { formatINR } from '../../utils/currency';
import { today } from '../../utils/dates';

interface MonthGridProps {
  year: number;
  month: number;
  days: CalendarDay[];
  weekTotals: WeekTotal[];
  monthTotal: number;
  onDayClick: (date: string) => void;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthGrid({ year, month, days, weekTotals, monthTotal, onDayClick }: MonthGridProps) {
  const todayStr = today();

  // Determine the weekday offset for the first day of the month.
  const firstDow = new Date(year, month - 1, 1).getDay();
  const padStart = Array(firstDow).fill(null);

  return (
    <div className="month-grid">
      {/* Header row */}
      <div className="month-grid__header">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="month-grid__weekday">{d}</div>
        ))}
        <div className="month-grid__weekday month-grid__weekday--total">Week</div>
      </div>

      {/* Day cells in 8-column rows (7 days + week total) */}
      <div className="month-grid__body">
        {/* Leading empty cells for offset */}
        {padStart.map((_, i) => (
          <div key={`pad-${i}`} className="day-cell day-cell--pad" />
        ))}
        {days.map((day, i) => {
          const dow = (firstDow + i) % 7;
          const weekIndex = Math.floor((firstDow + i) / 7);
          const isEndOfWeek = dow === 6;
          return (
            <>
              <DayCell
                key={day.date}
                day={day}
                isToday={day.date === todayStr}
                onClick={onDayClick}
              />
              {isEndOfWeek && (
                <div key={`wt-${weekIndex}`} className="month-grid__week-total">
                  {formatINR(weekTotals[weekIndex]?.total_paise ?? 0)}
                </div>
              )}
            </>
          );
        })}
      </div>

      {/* Month total footer */}
      <div className="month-grid__footer">
        <span>Month total</span>
        <span className="month-grid__month-total">{formatINR(monthTotal)}</span>
      </div>
    </div>
  );
}
