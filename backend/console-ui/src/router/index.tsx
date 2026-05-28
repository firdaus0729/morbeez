import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/Layout';
import { RequireAuth, RequireGuest, RequireModule } from './guards';
import { paths } from '../lib/routes';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TelecallerCrmPage } from '../pages/TelecallerCrmPage';
import { OperationsCenterPage } from '../pages/OperationsCenterPage';
import { IntelligenceHubPage } from '../pages/IntelligenceHubPage';
import { ProductGapsPage } from '../pages/ProductGapsPage';
import { AgronomistHubPage } from '../pages/AgronomistHubPage';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { AnalyticsHubPage } from '../pages/AnalyticsHubPage';
import { CommerceHubPage } from '../pages/CommerceHubPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { useAuth } from '../context/AuthContext';

function TelecallerRoute() {
  const { can } = useAuth();
  return <TelecallerCrmPage canWrite={can('telecaller_crm', 'write')} />;
}

function OperationsRoute() {
  const { can } = useAuth();
  return <OperationsCenterPage canWrite={can('operations', 'write')} />;
}

function IntelligenceRoute() {
  const { can } = useAuth();
  return <IntelligenceHubPage canWrite={can('intelligence', 'write')} />;
}

function AgronomistRoute() {
  const { can } = useAuth();
  return <AgronomistHubPage canWrite={can('agronomist', 'write')} />;
}

function ApprovalsRoute() {
  const { canApprove } = useAuth();
  return <ApprovalsPage canApprove={canApprove} />;
}

function SettingsRoute() {
  const { can } = useAuth();
  return <SettingsPage canRead={can('settings', 'read')} canWrite={can('settings', 'write')} />;
}

function EmployeesRoute() {
  const { can } = useAuth();
  return <EmployeesPage canWrite={can('settings', 'write')} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path={paths.login} element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={paths.dashboard} replace />} />
          <Route path={paths.dashboard} element={<DashboardPage />} />

          <Route element={<RequireModule module="telecaller_crm" />}>
            <Route path={paths.telecaller} element={<TelecallerRoute />} />
          </Route>

          <Route element={<RequireModule module="operations" />}>
            <Route path={paths.operations} element={<OperationsRoute />} />
          </Route>

          <Route element={<RequireModule module="intelligence" />}>
            <Route path={paths.intelligence} element={<IntelligenceRoute />} />
            <Route path={paths.productGaps} element={<ProductGapsPage />} />
          </Route>

          <Route element={<RequireModule module="agronomist" />}>
            <Route path={paths.agronomist} element={<AgronomistRoute />} />
          </Route>

          <Route element={<RequireModule module="approve_recommendations" />}>
            <Route path={paths.approvals} element={<ApprovalsRoute />} />
          </Route>

          <Route element={<RequireModule module="analytics" />}>
            <Route path={paths.analytics} element={<AnalyticsHubPage />} />
          </Route>

          <Route element={<RequireModule module="commerce" />}>
            <Route path={paths.commerce} element={<CommerceHubPage canWrite={can('commerce', 'write')} />} />
          </Route>

          <Route element={<RequireModule module="settings" />}>
            <Route path={paths.employees} element={<EmployeesRoute />} />
            <Route path={paths.employeeDetail} element={<EmployeesRoute />} />
            <Route path={paths.settings} element={<SettingsRoute />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={paths.dashboard} replace />} />
    </Routes>
  );
}
