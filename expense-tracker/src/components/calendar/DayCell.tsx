import type { CalendarDay } from '../../types/ledgr';
import { formatINR } from '../../utils/currency';

interface DayCellProps {
  day: CalendarDay;
  isToday: boolean;
  onClick: (date: string) => void;
}

export default function DayCell({ day, isToday, onClick }: DayCellProps) {
  const dateNum = parseInt(day.date.slice(8), 10);
  const isFuture = day.state === 'future';

  const stateClass = {
    locked:         'day-cell--locked',
    pending_review: 'day-cell--pending',
    has_entries:    'day-cell--has-entries',
    empty:          'day-cell--empty',
    future:         'day-cell--future',
    draft:          'day-cell--empty',
  }[day.state] ?? 'day-cell--empty';

  return (
    <button
      className={`day-cell ${stateClass} ${isToday ? 'day-cell--today' : ''}`}
      onClick={() => !isFuture && onClick(day.date)}
      disabled={isFuture}
      aria-label={`${day.date}, ${day.state}, ${day.entry_count} entries`}
    >
      <span className="day-cell__date">{dateNum}</span>

      {/* State indicators — icon or dot */}
      {day.state === 'locked' && (
        <span className="day-cell__lock" aria-hidden="true">🔒</span>
      )}
      {day.state === 'pending_review' && (
        <span className="day-cell__dot" aria-hidden="true" />
      )}

      {/* Amount shown when day has entries */}
      {day.entry_count > 0 && (
        <span className="day-cell__amount">{formatINR(day.total_paise)}</span>
      )}
    </button>
  );
}
