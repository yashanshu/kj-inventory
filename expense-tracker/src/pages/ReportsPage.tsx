import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPLReport, getGSTSummary } from '../api/reports';
import { formatINR } from '../utils/currency';
import { firstDayOfMonth, today } from '../utils/dates';

type Tab = 'pl' | 'gst';

export default function ReportsPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>('pl');
  const [from, setFrom] = useState(firstDayOfMonth(now.getFullYear(), now.getMonth() + 1));
  const [to, setTo] = useState(today());

  const { data: pl } = useQuery({
    queryKey: ['pl', from, to],
    queryFn: () => getPLReport(from, to),
    enabled: tab === 'pl',
  });

  const { data: gst } = useQuery({
    queryKey: ['gst', from, to],
    queryFn: () => getGSTSummary(from, to),
    enabled: tab === 'gst',
  });

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Tax Analytics</h1>
          <p className="page__subtitle">P&L · GST reconciliation</p>
        </div>
        <div className="date-range-filter">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input input--compact" />
          <span>–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input input--compact" />
        </div>
      </header>

      {/* Segment tabs — pill style */}
      <div className="tab-bar" style={{ marginBottom: 'var(--sp-8)' }}>
        {(['pl', 'gst'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-bar__tab ${tab === t ? 'tab-bar__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'pl' ? 'P & L Statement' : 'GST Register'}
          </button>
        ))}
      </div>

      {/* P&L tab */}
      {tab === 'pl' && pl && (
        <div>
          {/* KPI cards */}
          <div className="metric-grid" style={{ marginBottom: 'var(--sp-8)' }}>
            <div className="metric-card">
              <div className="metric-card__header">
                <span className="metric-card__label">Gross Total</span>
                <span className="metric-card__badge metric-card__badge--neutral">Gross</span>
              </div>
              <div className="metric-card__value">{formatINR(pl.total_paise)}</div>
              <span className="metric-card__bg-icon">₹</span>
            </div>
            <div className="metric-card">
              <div className="metric-card__header">
                <span className="metric-card__label">GST Input</span>
                <span className="metric-card__badge metric-card__badge--stable">Tax</span>
              </div>
              <div className="metric-card__value">{formatINR(pl.total_gst_paise)}</div>
              <span className="metric-card__bg-icon">%</span>
            </div>
            <div className="metric-card">
              <div className="metric-card__header">
                <span className="metric-card__label">Net Position</span>
                <span className="metric-card__badge metric-card__badge--up">Net</span>
              </div>
              <div className="metric-card__value">{formatINR(pl.net_paise)}</div>
              <span className="metric-card__bg-icon">#</span>
            </div>
          </div>

          {/* Category breakdown table */}
          <div className="calendar-container">
            <div className="calendar-header" style={{ marginBottom: 'var(--sp-4)' }}>
              <div className="calendar-title" style={{ fontSize: '16px' }}>Category Breakdown</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Entries</th>
                </tr>
              </thead>
              <tbody>
                {pl.by_category.map((c) => (
                  <tr key={c.category_id}>
                    <td>{c.category_name || c.category_id}</td>
                    <td className="text-right tabular-nums">{formatINR(c.total_paise)}</td>
                    <td className="text-right">{c.entry_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="report__export">
              <a href={`/api/v1/ledgr/exports/csv?from=${from}&to=${to}`} className="btn btn--secondary btn--sm">
                Export CSV
              </a>
              <a href={`/api/v1/ledgr/exports/pdf?from=${from}&to=${to}`} className="btn btn--secondary btn--sm">
                Export PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* GST tab */}
      {tab === 'gst' && gst && (
        <div className="calendar-container">
          <div className="calendar-header" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="calendar-title" style={{ fontSize: '16px' }}>GST Register</div>
            <div className="calendar-subtitle">CGST · SGST · IGST reconciliation</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rate</th>
                <th className="text-right">Taxable</th>
                <th className="text-right">CGST</th>
                <th className="text-right">SGST</th>
                <th className="text-right">IGST</th>
                <th className="text-right">Total GST</th>
              </tr>
            </thead>
            <tbody>
              {gst.rows.map((r) => (
                <tr key={r.gst_rate}>
                  <td><span className="badge badge--primary">{r.gst_rate}%</span></td>
                  <td className="text-right tabular-nums">{formatINR(r.taxable_paise)}</td>
                  <td className="text-right tabular-nums">{formatINR(r.cgst_paise)}</td>
                  <td className="text-right tabular-nums">{formatINR(r.sgst_paise)}</td>
                  <td className="text-right tabular-nums">{formatINR(r.igst_paise)}</td>
                  <td className="text-right tabular-nums">{formatINR(r.total_gst_paise)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="data-table__totals">
                <td>Total</td>
                <td className="text-right tabular-nums">{formatINR(gst.totals.taxable_paise)}</td>
                <td className="text-right tabular-nums">{formatINR(gst.totals.cgst_paise)}</td>
                <td className="text-right tabular-nums">{formatINR(gst.totals.sgst_paise)}</td>
                <td className="text-right tabular-nums">{formatINR(gst.totals.igst_paise)}</td>
                <td className="text-right tabular-nums">{formatINR(gst.totals.total_gst_paise)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
