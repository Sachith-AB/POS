import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logoutRequested } from '../features/auth/authSlice';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2.5 py-1.5 text-sm ${isActive ? 'bg-canvas text-ink' : 'text-muted hover:bg-canvas hover:text-ink'}`;

export function AppHeader() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings.data);
  const employee = useAppSelector((s) => s.auth.employee);

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
      {settings?.logoUrl ? (
        <img className="h-8 w-8 rounded object-contain" src={`http://localhost:4000${settings.logoUrl}`} alt="" />
      ) : null}
      <span className="text-base font-bold">{settings?.companyName ?? 'POS'}</span>
      {employee ? (
        <nav className="ml-auto flex items-center gap-2">
          <NavLink to="/pos" className={linkClass}>
            POS
          </NavLink>
          <NavLink to="/stock" className={linkClass}>
            Stock
          </NavLink>
          {employee.role === 'OWNER' ? (
            <NavLink to="/settings" className={linkClass}>
              Settings
            </NavLink>
          ) : null}
          <span className="px-2.5 py-1.5 text-sm text-muted">
            {employee.name} ({employee.role})
          </span>
          <button
            onClick={() => dispatch(logoutRequested())}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink hover:bg-canvas"
          >
            Switch User
          </button>
        </nav>
      ) : null}
    </header>
  );
}
