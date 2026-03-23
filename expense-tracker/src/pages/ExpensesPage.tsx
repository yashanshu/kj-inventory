import { useState } from 'react';
import ExpenseList from '../components/expenses/ExpenseList';
import QuickAddFab from '../components/expenses/QuickAddFab';
import { firstDayOfMonth, today } from '../utils/dates';

export default function ExpensesPage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth(now.getFullYear(), now.getMonth() + 1));
  const [dateTo, setDateTo] = useState(today());

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Master Ledger</h1>
          <p className="page__subtitle">All entries · sorted newest first</p>
        </div>
        {/* Date range filter — tonal pill */}
        <div className="date-range-filter">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input input--compact"
          />
          <span>–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input input--compact"
          />
        </div>
      </header>

      <ExpenseList filters={{ date_from: dateFrom, date_to: dateTo, per_page: 100 }} />
      <QuickAddFab />
    </div>
  );
}
