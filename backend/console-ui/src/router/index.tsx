import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../components/Layout';
import { RequireAuth, RequireGuest, RoleHomeRedirect } from './guards';
import { ProtectedPage } from './ProtectedPage';
import { paths } from '../lib/routes';
import { LoginPage } from '../pages/LoginPage';
import { AcceptInvitePage } from '../pages/AcceptInvitePage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
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
    { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
    { path: paths.resetPassword, element: <ResetPasswordPage /> },
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
            {
              path: paths.dashboard,
              element: (
                <ProtectedPage module="dashboard">
                  <DashboardPage />
                </ProtectedPage>
              ),
            },
            {
              path: paths.telecaller,
              element: (
                <ProtectedPage module="telecaller_crm">
                  <TelecallerRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.operations,
              element: (
                <ProtectedPage module="operations">
                  <OperationsRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.intelligence,
              element: (
                <ProtectedPage module="intelligence">
                  <IntelligenceRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.productGaps,
              element: (
                <ProtectedPage module="intelligence">
                  <ProductGapsPage />
                </ProtectedPage>
              ),
            },
            {
              path: paths.agronomist,
              element: (
                <ProtectedPage module="agronomist">
                  <AgronomistRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.approvals,
              element: (
                <ProtectedPage module="approve_recommendations">
                  <ApprovalsRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.analytics,
              element: (
                <ProtectedPage module="analytics">
                  <AnalyticsHubPage />
                </ProtectedPage>
              ),
            },
            {
              path: paths.commerce,
              element: (
                <ProtectedPage module="commerce">
                  <CommerceRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.employees,
              element: (
                <ProtectedPage module="settings">
                  <EmployeesRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.employeeDetail,
              element: (
                <ProtectedPage module="settings">
                  <EmployeesRoute />
                </ProtectedPage>
              ),
            },
            {
              path: paths.settings,
              element: (
                <ProtectedPage module="settings">
                  <SettingsRoute />
                </ProtectedPage>
              ),
            },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to={`/${paths.dashboard}`} replace /> },
  ],
  { basename: '/morbeez-staff' }
);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
