import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../components/Layout';
import { RequireAuth, RequireGuest, RequireModule, RoleHomeRedirect } from './guards';
import { paths } from '../lib/routes';
import { LoginPage } from '../pages/LoginPage';
import { AcceptInvitePage } from '../pages/AcceptInvitePage';
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

function CommerceRoute() {
  const { can } = useAuth();
  return <CommerceHubPage canWrite={can('commerce', 'write')} />;
}

export const appRouter = createBrowserRouter(
  [
    { path: paths.acceptInvite, element: <AcceptInvitePage /> },
    {
      element: <RequireGuest />,
      children: [{ path: paths.login, element: <LoginPage /> }],
    },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true, element: <RoleHomeRedirect /> },
            { path: paths.dashboard, element: <DashboardPage /> },
            {
              element: <RequireModule module="telecaller_crm" />,
              children: [{ path: paths.telecaller, element: <TelecallerRoute /> }],
            },
            {
              element: <RequireModule module="operations" />,
              children: [{ path: paths.operations, element: <OperationsRoute /> }],
            },
            {
              element: <RequireModule module="intelligence" />,
              children: [
                { path: paths.intelligence, element: <IntelligenceRoute /> },
                { path: paths.productGaps, element: <ProductGapsPage /> },
              ],
            },
            {
              element: <RequireModule module="agronomist" />,
              children: [{ path: paths.agronomist, element: <AgronomistRoute /> }],
            },
            {
              element: <RequireModule module="approve_recommendations" />,
              children: [{ path: paths.approvals, element: <ApprovalsRoute /> }],
            },
            {
              element: <RequireModule module="analytics" />,
              children: [{ path: paths.analytics, element: <AnalyticsHubPage /> }],
            },
            {
              element: <RequireModule module="commerce" />,
              children: [{ path: paths.commerce, element: <CommerceRoute /> }],
            },
            {
              element: <RequireModule module="settings" />,
              children: [
                { path: paths.employees, element: <EmployeesRoute /> },
                { path: paths.employeeDetail, element: <EmployeesRoute /> },
                { path: paths.settings, element: <SettingsRoute /> },
              ],
            },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to={`/${paths.dashboard}`} replace /> },
  ],
  { basename: '/console' }
);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
