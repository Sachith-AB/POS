import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button } from './Button';
import { logoutRequested } from '../features/auth/authSlice';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2.5 py-1.5 text-sm ${isActive ? 'bg-canvas text-ink' : 'text-muted hover:bg-canvas hover:text-ink'}`;

export function AppHeader() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings.data);
  const employee = useAppSelector((s) => s.auth.employee);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="relative flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border bg-surface px-4 py-2.5 z-50">
      <div className="flex items-center justify-between w-full sm:w-auto">
        <div className="flex items-center gap-3">
          {settings?.logoUrl ? (
            <img className="h-8 w-8 rounded object-contain" src={`http://localhost:4000${settings.logoUrl}`} alt="" />
          ) : null}
          <span className="text-base font-bold">{settings?.companyName ?? 'POS'}</span>
        </div>
        {employee ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg border border-border text-ink hover:bg-canvas sm:hidden cursor-pointer focus:outline-none"
            aria-label="Toggle menu"
          >
            {isOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
        ) : null}
      </div>

      {employee ? (
        <nav
          className={`${
            isOpen ? 'flex' : 'hidden'
          } absolute top-full left-0 right-0 bg-surface shadow-lg z-50 p-4 border-b border-border flex-col gap-2 sm:static sm:flex sm:flex-row sm:items-center sm:gap-2 sm:w-auto sm:ml-auto sm:p-0 sm:border-none sm:shadow-none`}
        >
          <NavLink to="/pos" className={linkClass} onClick={() => setIsOpen(false)}>
            POS
          </NavLink>
          <NavLink to="/repairs" className={linkClass} onClick={() => setIsOpen(false)}>
            Repairs
          </NavLink>
          <NavLink to="/installments" className={linkClass} onClick={() => setIsOpen(false)}>
            Installments
          </NavLink>
          <NavLink to="/stock" className={linkClass} onClick={() => setIsOpen(false)}>
            Stock
          </NavLink>
          <NavLink to="/customers" className={linkClass} onClick={() => setIsOpen(false)}>
            Customers
          </NavLink>
          {employee.role === 'OWNER' ? (
            <>
              <NavLink to="/dashboard" className={linkClass} onClick={() => setIsOpen(false)}>
                Dashboard
              </NavLink>
              <NavLink to="/reports" className={linkClass} onClick={() => setIsOpen(false)}>
                Reports
              </NavLink>
              <NavLink to="/settings" className={linkClass} onClick={() => setIsOpen(false)}>
                Settings
              </NavLink>
            </>
          ) : null}

          <div className="border-t border-border my-1 sm:hidden" />

          <span className="px-2.5 py-1.5 text-sm text-muted block sm:inline">
            {employee.name} ({employee.role})
          </span>
          <Button
            onClick={() => {
              setIsOpen(false);
              dispatch(logoutRequested());
            }}
            variant="secondary"
            className="py-1.5 px-2.5 w-full sm:w-auto"
          >
            Switch User
          </Button>
        </nav>
      ) : null}
    </header>
  );
}
