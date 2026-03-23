import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCategories } from '../../api/categories';
import { createExpense, updateExpense } from '../../api/expenses';
import { listStores } from '../../api/stores';
import { computeGST } from '../../utils/gst';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { today } from '../../utils/dates';
import type { Expense, FundingSource, PaymentMethod, GSTRate } from '../../types/ledgr';
import { useUIStore } from '../../stores/uiStore';

interface ExpenseFormProps {
  initial?: Partial<Expense>;
  defaultDate?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const GST_RATES = ['0', '5', '12', '18', '28'] as const;
const FUNDING_SOURCES: FundingSource[] = ['personal', 'partner2', 'partner3', 'payout', 'loan'];
const PAYMENT_METHODS: PaymentMethod[] = ['upi', 'card', 'cash', 'neft', 'other'];

export default function ExpenseForm({ initial, defaultDate, onSuccess, onCancel }: ExpenseFormProps) {
  const qc = useQueryClient();
  const lastCat = useUIStore((s) => s.lastCategoryId);
  const lastFs = useUIStore((s) => s.lastFundingSource);
  const setLastCat = useUIStore((s) => s.setLastCategory);
  const setLastFs = useUIStore((s) => s.setLastFundingSource);

  const [amountStr, setAmountStr] = useState(initial?.amount_paise ? paiseToRupees(initial.amount_paise) : '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? lastCat ?? '');
  const [fundingSource, setFundingSource] = useState<FundingSource>((initial?.funding_source ?? lastFs ?? 'payout') as FundingSource);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.payment_method ?? 'upi');
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [gstRate, setGstRate] = useState<GSTRate>((initial?.gst_rate ?? '0') as GSTRate);
  const [gstInclusive, setGstInclusive] = useState(initial?.gst_inclusive ?? true);
  const [showMore, setShowMore] = useState(false);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const { data: stores } = useQuery({ queryKey: ['stores'], queryFn: listStores });

  const amountPaise = rupeesToPaise(amountStr);
  const gst = computeGST(amountPaise, parseInt(gstRate) as 0 | 5 | 12 | 18 | 28, gstInclusive, false);

  const mutation = useMutation({
    mutationFn: (data: Partial<Expense>) =>
      initial?.id ? updateExpense(initial.id, data) : createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      if (categoryId) setLastCat(categoryId);
      setLastFs(fundingSource);
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      date,
      amount_paise: gstInclusive ? amountPaise : gst.totalPaise,
      base_paise: gst.basePaise,
      gst_rate: gstRate,
      cgst_paise: gst.cgstPaise,
      sgst_paise: gst.sgstPaise,
      igst_paise: gst.igstPaise,
      gst_inclusive: gstInclusive,
      category_id: categoryId,
      funding_source: fundingSource,
      payment_method: paymentMethod,
      description: description || undefined,
      entry_type: 'expense',
    });
  };

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="expense-form__field">
        <label>Amount (₹)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          required
          className="input"
        />
      </div>

      <div className="expense-form__field">
        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="input">
          <option value="">Select category</option>
          {categories?.filter((c) => !c.is_hidden).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="expense-form__field">
        <label>Funding source</label>
        <select value={fundingSource} onChange={(e) => setFundingSource(e.target.value as FundingSource)} className="input">
          {FUNDING_SOURCES.map((fs) => <option key={fs} value={fs}>{fs}</option>)}
        </select>
      </div>

      <div className="expense-form__field">
        <label>Payment method</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
          {PAYMENT_METHODS.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
        </select>
      </div>

      <div className="expense-form__field">
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </div>

      <button type="button" className="btn btn--ghost" onClick={() => setShowMore(!showMore)}>
        {showMore ? 'Fewer details' : 'More details'}
      </button>

      {showMore && (
        <>
          <div className="expense-form__field">
            <label>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
          </div>

          <div className="expense-form__field">
            <label>GST rate</label>
            <select value={gstRate} onChange={(e) => setGstRate(e.target.value as GSTRate)} className="input">
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>

          {gstRate !== '0' && (
            <div className="expense-form__gst-preview">
              <label>
                <input type="checkbox" checked={gstInclusive} onChange={(e) => setGstInclusive(e.target.checked)} />
                Amount includes GST
              </label>
              <div className="expense-form__gst-breakdown">
                <span>Base: ₹{(gst.basePaise / 100).toFixed(2)}</span>
                <span>GST: ₹{(gst.gstPaise / 100).toFixed(2)}</span>
                <span>Total: ₹{(gst.totalPaise / 100).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="expense-form__field">
            <label>Store</label>
            <select className="input">
              <option value="">No store</option>
              {stores?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </>
      )}

      {mutation.isError && (
        <div className="expense-form__error">Failed to save. Please try again.</div>
      )}

      <div className="expense-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : initial?.id ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
}
