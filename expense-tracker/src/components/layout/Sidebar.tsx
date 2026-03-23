import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Receipt, Users, BarChart3, Settings, Plus } from 'lucide-react';
import { useState } from 'react';
import ExpenseForm from '../expenses/ExpenseForm';
import { today } from '../../utils/dates';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Command', icon: LayoutDashboard },
  { to: '/calendar', label: 'Journals', icon: Calendar },
  { to: '/expenses', label: 'Ledger', icon: Receipt },
  { to: '/partners', label: 'Partners', icon: Users },
  { to: '/reports', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <>
      <nav className="sidebar" aria-label="Main navigation">
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-icon">L</div>
          <div className="sidebar__brand-text">
            <span className="sidebar__logo">Ledgr</span>
            <span className="sidebar__subtitle">Architectural Ledger</span>
          </div>
        </div>

        {/* Nav items */}
        <ul className="sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Bottom: settings + new entry CTA */}
        <div className="sidebar__bottom">
          <NavLink to="/settings" className="sidebar__link" style={{ marginBottom: '12px' }}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          <button
            className="sidebar__new-entry"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus size={18} />
            New Entry
          </button>
        </div>
      </nav>

      {/* Quick-add modal triggered from sidebar CTA */}
      {showQuickAdd && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2 className="modal__title">New Entry</h2>
            <ExpenseForm
              defaultDate={today()}
              onSuccess={() => setShowQuickAdd(false)}
              onCancel={() => setShowQuickAdd(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
