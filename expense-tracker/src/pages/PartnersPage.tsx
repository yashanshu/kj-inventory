import { useQuery } from '@tanstack/react-query';
import { getPartnerBalances } from '../api/partners';
import { formatINR } from '../utils/currency';

const FUNDING_LABEL: Record<string, string> = {
  personal: 'Personal',
  partner2: 'Partner 2',
  partner3: 'Partner 3',
  payout:   'Payout',
  loan:     'Loan',
};

export default function PartnersPage() {
  const { data } = useQuery({
    queryKey: ['partner-balances'],
    queryFn: getPartnerBalances,
  });

  const balances = data?.balances ?? [];

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Partners</h1>
          <p className="page__subtitle">Funding source balances &amp; settlement tracking</p>
        </div>
      </header>

      <ul className="partner-list">
        {balances.map((b) => (
          <li key={b.funding_source} className="partner-card">
            <div className="partner-card__name">
              {FUNDING_LABEL[b.funding_source] ?? b.funding_source}
            </div>
            <div className="partner-card__row">
              <span>Total contributed</span>
              <span className="tabular-nums">{formatINR(b.total_spent_paise)}</span>
            </div>
            <div className="partner-card__row">
              <span>Total settled</span>
              <span className="tabular-nums">{formatINR(b.total_settled_paise)}</span>
            </div>
            <div className="partner-card__row partner-card__row--net">
              <span>Net outstanding</span>
              <span className={`tabular-nums ${b.net_owed_paise > 0 ? 'text-warning' : 'text-success'}`}>
                {formatINR(Math.abs(b.net_owed_paise))}
                {b.net_owed_paise !== 0 && (
                  <span style={{ fontSize: '11px', marginLeft: '4px', fontWeight: 600 }}>
                    {b.net_owed_paise > 0 ? 'owed' : 'surplus'}
                  </span>
                )}
              </span>
            </div>
          </li>
        ))}
        {balances.length === 0 && (
          <li className="empty-state">No partner balances recorded yet.</li>
        )}
      </ul>
    </div>
  );
}
