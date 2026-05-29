import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../lib/role-home';

/** Inline route guard — avoids nested <Outlet> layout routes that can leave stale page content. */
export function ProtectedPage({
  module,
  mode = 'read',
  children,
}: {
  module: string;
  mode?: 'read' | 'write';
  children: ReactNode;
}) {
  const { can, admin } = useAuth();

  if (!can(module, mode)) {
    return <Navigate to={getRoleHomePath(admin?.role)} replace />;
  }

  return <>{children}</>;
}
