import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  canAccess,
  clearToken,
  fetchSession,
  getToken,
  type ApiModule,
  type SessionAdmin,
} from '../lib/api';

type AuthState = {
  ready: boolean;
  authed: boolean;
  admin: SessionAdmin | null;
  modules: ApiModule[];
  canApprove: boolean;
  can: (module: string, mode?: 'read' | 'write') => boolean;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [admin, setAdmin] = useState<SessionAdmin | null>(null);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [canApprove, setCanApprove] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setAuthed(false);
      setAdmin(null);
      setModules([]);
      setCanApprove(false);
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
      setAdmin(null);
      setModules([]);
      setCanApprove(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
    setAuthed(false);
    setAdmin(null);
    setModules([]);
    setCanApprove(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      authed,
      admin,
      modules,
      canApprove,
      can: (module, mode = 'read') => canAccess(modules, module, mode),
      logout,
      refresh,
    }),
    [ready, authed, admin, modules, canApprove, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
