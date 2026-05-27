import { useCallback, useEffect, useState } from 'react';
import {
  clearToken,
  canAccess,
  fetchSession,
  getToken,
  type ApiModule,
  type SessionAdmin,
} from './lib/api';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ProductGapsPage } from './pages/ProductGapsPage';
import { IntelligenceHubPage } from './pages/IntelligenceHubPage';
import { OperationsCenterPage } from './pages/OperationsCenterPage';
import { TelecallerCrmPage } from './pages/TelecallerCrmPage';
import { AgronomistHubPage } from './pages/AgronomistHubPage';
import { AnalyticsHubPage } from './pages/AnalyticsHubPage';
import { CommerceHubPage } from './pages/CommerceHubPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [admin, setAdmin] = useState<SessionAdmin | null>(null);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [page, setPage] = useState('dashboard');

  const bootstrap = useCallback(async () => {
    if (!getToken()) {
      setAuthed(false);
      setReady(true);
      return;
    }
    try {
      const session = await fetchSession();
      setAdmin(session.admin);
      setModules(session.modules);
      setCanApprove(session.canApproveRecommendations);
      setAuthed(true);
    } catch {
      clearToken();
      setAuthed(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  function handleLogout() {
    clearToken();
    setAuthed(false);
    setAdmin(null);
    setPage('dashboard');
  }

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onSuccess={() => bootstrap()} />;
  }

  if (!admin) return null;

  let content = <DashboardPage />;
  if (page === 'approvals') content = <ApprovalsPage canApprove={canApprove} />;
  if (page === 'gaps') content = <ProductGapsPage />;
  if (page === 'intelligence') {
    content = <IntelligenceHubPage canWrite={canAccess(modules, 'intelligence', 'write')} />;
  }
  if (page === 'operations') {
    content = (
      <OperationsCenterPage canWrite={canAccess(modules, 'operations', 'write')} />
    );
  }
  if (page === 'telecaller') {
    content = (
      <TelecallerCrmPage canWrite={canAccess(modules, 'telecaller_crm', 'write')} />
    );
  }
  if (page === 'agronomist') {
    content = <AgronomistHubPage canWrite={canAccess(modules, 'agronomist', 'write')} />;
  }
  if (page === 'analytics') {
    content = <AnalyticsHubPage />;
  }
  if (page === 'commerce') {
    content = <CommerceHubPage />;
  }
  if (page === 'settings') {
    content = <SettingsPage canRead={canAccess(modules, 'settings', 'read')} />;
  }

  return (
    <Layout
      admin={admin}
      modules={modules}
      page={page}
      onNavigate={setPage}
      onLogout={handleLogout}
    >
      {content}
    </Layout>
  );
}

export default App;
