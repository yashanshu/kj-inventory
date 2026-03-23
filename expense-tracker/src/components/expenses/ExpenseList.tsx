import { useQuery } from '@tanstack/react-query';
import { listExpenses, type ExpenseFilters } from '../../api/expenses';
import ExpenseRow from './ExpenseRow';

interface ExpenseListProps {
  filters?: ExpenseFilters;
  locked?: boolean;
}

export default function ExpenseList({ filters, locked }: ExpenseListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => listExpenses(filters),
  });

  if (isLoading) return <div className="loading">Loading…</div>;

  const expenses = data?.data ?? [];

  if (expenses.length === 0) {
    return <div className="empty-state">No expenses found.</div>;
  }

  return (
    <ul className="expense-list">
      {expenses.map((e) => (
        <ExpenseRow key={e.id} expense={e} locked={locked} />
      ))}
    </ul>
  );
}
