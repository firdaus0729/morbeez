import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials, roleLabel } from '../lib/format';
import { matchRouteMeta } from '../lib/routes';
import { paths, toPath } from '../lib/routes';
import { LogoMark } from './LogoMark';
import { SidebarNav } from './SidebarNav';
import { ConsoleTopbar } from './ConsoleTopbar';
import { ConsolePageSearchProvider } from '../context/ConsolePageSearchContext';
import { TelecallerHeaderProvider } from '../context/TelecallerHeaderContext';
import { TelecallerWorkspaceHeader } from './telecaller/TelecallerWorkspaceHeader';
import { cn } from '../lib/cn';

export function AppLayout() {
  const { admin, modules, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateText, setDateText] = useState('');

  const meta = matchRouteMeta(location.pathname);
  const isTelecallerCrm = meta.pageKey === 'telecaller';
  const displayName = admin?.fullName ?? admin?.email ?? '';
  const avatar = initials(displayName);

  useEffect(() => {
    setDateText(
      new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    );
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!admin) return null;

  function handleLogout() {
    logout();
    navigate(toPath(paths.login), { replace: true });
  }

  return (
    <div className={cn('app-shell', `route-${meta.pageKey}`)}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="sidebar" id="sidebar">
        <div className="sidebar-logo">
          <LogoMark variant="light" />
          <div className="sidebar-logo-text">
            <span className="logo-title">Morbeez</span>
            <span className="logo-sub">AGRICULTURE</span>
            <span className="sidebar-tagline">Grow Better. Live Better.</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <SidebarNav modules={modules} onNavigate={() => setSidebarOpen(false)} />
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="sidebar-support">
            <span className="support-dot" />
            Live Support
          </button>
          <div className="sidebar-profile">
            <span className="avatar">{avatar}</span>
            <span className="profile-text">
              <strong>{displayName}</strong>
              <small>{roleLabel(admin.role)}</small>
            </span>
          </div>
          <button type="button" className="btn-signout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        {isTelecallerCrm ? (
          <TelecallerHeaderProvider>
            <TelecallerWorkspaceHeader onOpenMenu={() => setSidebarOpen(true)} onLogout={handleLogout} />
            <div className="content console-page-content" id="main-content">
              <Outlet key={location.pathname} />
            </div>
          </TelecallerHeaderProvider>
        ) : (
          <ConsolePageSearchProvider key={meta.pageKey} pageKey={meta.pageKey}>
            <ConsoleTopbar
              pathname={location.pathname}
              dateText={dateText}
              onOpenMenu={() => setSidebarOpen(true)}
              onLogout={handleLogout}
            />
            <div className="content console-page-content" id="main-content">
              <Outlet key={location.pathname} />
            </div>
          </ConsolePageSearchProvider>
        )}
      </div>
    </div>
  );
}
