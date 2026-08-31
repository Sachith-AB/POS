import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { useThemeSync } from './app/useThemeSync';
import { meRequested } from './features/auth/authSlice';
import { settingsRequested } from './features/settings/settingsSlice';
import { AppHeader } from './components/AppHeader';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';

const StockPage = lazy(() => import('./pages/StockPage').then((m) => ({ default: m.StockPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const RepairsPage = lazy(() => import('./pages/RepairsPage').then((m) => ({ default: m.RepairsPage })));
const InstallmentsPage = lazy(() => import('./pages/InstallmentsPage').then((m) => ({ default: m.InstallmentsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { employee, status } = useAppSelector((s) => s.auth);
  if (status === 'checking') return null;
  if (!employee) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const dispatch = useAppDispatch();
  useThemeSync();

  useEffect(() => {
    dispatch(meRequested());
    dispatch(settingsRequested());
  }, [dispatch]);

  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/pos"
            element={
              <RequireAuth>
                <PosPage />
              </RequireAuth>
            }
          />
          <Route
            path="/repairs"
            element={
              <RequireAuth>
                <RepairsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/installments"
            element={
              <RequireAuth>
                <InstallmentsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/stock"
            element={
              <RequireAuth>
                <StockPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

