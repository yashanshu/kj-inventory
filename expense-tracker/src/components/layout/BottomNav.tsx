import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Receipt, BarChart3, Users } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Command', icon: LayoutDashboard },
  { to: '/calendar', label: 'Journals', icon: Calendar },
  { to: '/expenses', label: 'Ledger', icon: Receipt },
  { to: '/reports', label: 'Analytics', icon: BarChart3 },
  { to: '/partners', label: 'Partners', icon: Users },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'
          }
        >
          <span className="bottom-nav__icon"><Icon size={22} /></span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
