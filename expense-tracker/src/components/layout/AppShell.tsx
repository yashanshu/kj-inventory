import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-shell__content">
        {/* Mobile-only top bar */}
        <header className="top-bar">
          <span className="top-bar__logo">Ledgr</span>
        </header>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
