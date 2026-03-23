import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Lock, Unlock, CheckCircle, Plus } from 'lucide-react';
import { listExpenses } from '../../api/expenses';
import { getDayLog, submitDay, lockDay, unlockDay } from '../../api/daylog';
import { useAuthStore } from '../../stores/authStore';
import { formatDate } from '../../utils/dates';
import { formatINR } from '../../utils/currency';
import ExpenseRow from '../expenses/ExpenseRow';
import ExpenseForm from '../expenses/ExpenseForm';

interface DayPanelProps {
  date: string;
  onClose: () => void;
  onAddExpense: (date: string) => void;
}

export default function DayPanel({ date, onClose }: DayPanelProps) {
  const role = useAuthStore((s) => s.user?.role);
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: dayLog } = useQuery({
    queryKey: ['daylog', date],
    queryFn: () => getDayLog(date),
  });

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', { date_from: date, date_to: date }],
    queryFn: () => listExpenses({ date_from: date, date_to: date, per_page: 200 }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['daylog', date] });
    qc.invalidateQueries({ queryKey: ['calendar'] });
  };

  const submitMut = useMutation({ mutationFn: () => submitDay(date), onSuccess: invalidate });
  const lockMut   = useMutation({ mutationFn: () => lockDay(date),   onSuccess: invalidate });
  const unlockMut = useMutation({ mutationFn: () => unlockDay(date), onSuccess: invalidate });

  const expenses = expensesData?.data ?? [];
  const isLocked = dayLog?.state === 'locked';
  const totalPaise = expenses.reduce((s, e) => s + e.amount_paise, 0);
  const gstPaise   = expenses.reduce((s, e) => s + e.cgst_paise + e.sgst_paise + e.igst_paise, 0);

  const stateLabel: Record<string, string> = {
    draft:          'Draft',
    pending_review: 'Pending Review',
    locked:         'Locked',
  };

  return (
    <>
      {/* Panel header */}
      <div className="day-panel__header">
        <div>
          <div className="day-panel__date">{formatDate(date)}</div>
          {dayLog && (
            <span className={`badge ${isLocked ? 'badge--success' : dayLog.state === 'pending_review' ? 'badge--warning' : 'badge--neutral'}`}
              style={{ marginTop: '6px', display: 'inline-flex' }}>
              {stateLabel[dayLog.state] ?? dayLog.state}
            </span>
          )}
        </div>
        <button className="day-panel__close" onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>
      </div>

      {/* Day financial summary */}
      {expenses.length > 0 && (
        <div className="day-panel__summary">
          <div className="day-panel__summary-row">
            <span className="day-panel__summary-label">Gross total</span>
            <span className="day-panel__summary-value">{formatINR(totalPaise)}</span>
          </div>
          <div className="day-panel__summary-row">
            <span className="day-panel__summary-label">GST</span>
            <span className="day-panel__summary-value">{formatINR(gstPaise)}</span>
          </div>
          <div className="day-panel__summary-row">
            <span className="day-panel__summary-label">Net (excl. GST)</span>
            <span className="day-panel__summary-value day-panel__summary-value--primary">
              {formatINR(totalPaise - gstPaise)}
            </span>
          </div>
          <div className="day-panel__summary-row">
            <span className="day-panel__summary-label">Entries</span>
            <span className="day-panel__summary-value">{expenses.length}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="day-panel__actions">
        {!isLocked && (
          <button className="btn btn--primary btn--sm" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Add entry
          </button>
        )}
        {dayLog?.state === 'draft' && expenses.length > 0 && (
          <button className="btn btn--secondary btn--sm" onClick={() => submitMut.mutate()}>
            <CheckCircle size={15} /> Mark Done
          </button>
        )}
        {dayLog?.state === 'pending_review' && role === 'admin' && (
          <button className="btn btn--primary btn--sm" onClick={() => lockMut.mutate()}>
            <Lock size={15} /> Approve & Lock
          </button>
        )}
        {isLocked && role === 'admin' && (
          <button className="btn btn--secondary btn--sm" onClick={() => unlockMut.mutate()}>
            <Unlock size={15} /> Unlock
          </button>
        )}
      </div>

      {/* Entry list */}
      <ul className="day-panel__expense-list">
        {expenses.map((e) => (
          <ExpenseRow key={e.id} expense={e} locked={isLocked} />
        ))}
        {expenses.length === 0 && (
          <li className="day-panel__empty">No entries for this day.</li>
        )}
      </ul>

      {/* Inline add-entry modal */}
      {showAddForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">Add Entry — {formatDate(date)}</h2>
            <ExpenseForm
              defaultDate={date}
              onSuccess={() => {
                setShowAddForm(false);
                qc.invalidateQueries({ queryKey: ['expenses'] });
                qc.invalidateQueries({ queryKey: ['calendar'] });
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
