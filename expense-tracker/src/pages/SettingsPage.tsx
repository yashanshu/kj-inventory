import { useQuery } from '@tanstack/react-query';
import { listCategories } from '../api/categories';
import { listTemplates } from '../api/templates';

const FUNDING_LABEL: Record<string, string> = {
  personal: 'Personal', partner2: 'Partner 2', partner3: 'Partner 3', payout: 'Payout', loan: 'Loan',
};

export default function SettingsPage() {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const { data: templates }  = useQuery({ queryKey: ['templates'],  queryFn: listTemplates  });

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Settings &amp; Config</h1>
          <p className="page__subtitle">Categories · templates · organisation</p>
        </div>
      </header>

      {/* Categories */}
      <section className="section">
        <h2 className="section__header">Expense Categories</h2>
        <div className="calendar-container" style={{ padding: 'var(--sp-2) 0' }}>
          <ul className="settings-list">
            {categories?.map((c) => (
              <li key={c.id} className="settings-list__row">
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                  {c.is_system && <span className="badge badge--neutral">System</span>}
                  {c.is_hidden && <span className="badge badge--warning">Hidden</span>}
                </div>
              </li>
            ))}
            {categories?.length === 0 && (
              <li className="empty-state" style={{ padding: 'var(--sp-6) var(--sp-4)' }}>
                No categories yet.
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Templates */}
      <section className="section">
        <h2 className="section__header">Quick-add Templates</h2>
        <div className="calendar-container" style={{ padding: 'var(--sp-2) 0' }}>
          <ul className="settings-list">
            {templates?.map((t) => (
              <li key={t.id} className="settings-list__row">
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span className="badge badge--neutral">
                  {FUNDING_LABEL[t.funding_source] ?? t.funding_source}
                </span>
              </li>
            ))}
            {templates?.length === 0 && (
              <li className="empty-state" style={{ padding: 'var(--sp-6) var(--sp-4)' }}>
                No templates yet.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
