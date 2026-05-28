import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../lib/role-home';
import { paths, toPath } from '../lib/routes';
import { Loading } from '../components/ui';

export function RequireAuth() {
  const { ready, authed } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600">
        <Loading label="Loading console…" />
      </div>
    );
  }

  if (!authed) {
    return <Navigate to={toPath(paths.login)} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { ready, authed } = useAuth();
  const location = useLocation();
  const { admin } = useAuth();
  const from =
    (location.state as { from?: string } | null)?.from ?? getRoleHomePath(admin?.role);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600">
        <Loading label="Loading…" />
      </div>
    );
  }

  if (authed) {
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}

export function RequireModule({ module, mode = 'read' }: { module: string; mode?: 'read' | 'write' }) {
  const { can, admin } = useAuth();

  if (!can(module, mode)) {
    return <Navigate to={getRoleHomePath(admin?.role)} replace />;
  }

  return <Outlet />;
}

export function RoleHomeRedirect() {
  const { admin, ready, authed } = useAuth();
  if (!ready || !authed) return null;
  return <Navigate to={getRoleHomePath(admin?.role)} replace />;
}
