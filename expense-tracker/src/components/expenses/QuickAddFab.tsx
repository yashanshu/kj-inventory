import { useState } from 'react';
import { Plus } from 'lucide-react';
import ExpenseForm from './ExpenseForm';
import { today } from '../../utils/dates';

export default function QuickAddFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="quick-add-fab"
        onClick={() => setOpen(true)}
        aria-label="Quick add expense"
      >
        <Plus size={24} />
      </button>

      {open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">Add Expense</h2>
            <ExpenseForm
              defaultDate={today()}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
