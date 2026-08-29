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
            path="/stock"
            element={
              <RequireAuth>
                <StockPage />
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
