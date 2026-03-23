import { Lock } from 'lucide-react';
import type { Expense } from '../../types/ledgr';
import { formatINR } from '../../utils/currency';

interface ExpenseRowProps {
  expense: Expense;
  locked?: boolean;
  onEdit?: (e: Expense) => void;
}

const FUNDING_LABEL: Record<string, string> = {
  personal: 'Personal',
  partner2: 'Partner 2',
  partner3: 'Partner 3',
  payout:   'Payout',
  loan:     'Loan',
};

const PM_LABEL: Record<string, string> = {
  upi:   'UPI',
  card:  'Card',
  cash:  'Cash',
  neft:  'NEFT',
  other: 'Other',
};

export default function ExpenseRow({ expense, locked, onEdit }: ExpenseRowProps) {
  const typeClass = `expense-row__type expense-row__type--${expense.entry_type}`;

  return (
    <li className={`expense-row ${locked ? 'expense-row--locked' : ''}`}>
      <div className="expense-row__main">
        <span className="expense-row__amount">{formatINR(expense.amount_paise)}</span>
        <span className={typeClass}>{expense.entry_type}</span>
        {locked && <Lock size={13} className="expense-row__lock" />}
        {!locked && onEdit && (
          <button className="expense-row__edit" onClick={() => onEdit(expense)}>Edit</button>
        )}
      </div>

      {expense.description && (
        <div className="expense-row__desc">{expense.description}</div>
      )}

      <div className="expense-row__meta">
        <span className="expense-row__meta-tag">
          {FUNDING_LABEL[expense.funding_source] ?? expense.funding_source}
        </span>
        <span className="expense-row__meta-tag">
          {PM_LABEL[expense.payment_method] ?? expense.payment_method}
        </span>
        {expense.gst_rate !== '0' && (
          <span className="expense-row__meta-tag">GST {expense.gst_rate}%</span>
        )}
      </div>
    </li>
  );
}
