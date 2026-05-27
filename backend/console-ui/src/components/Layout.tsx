import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials, roleLabel } from '../lib/format';
import { matchRouteMeta } from '../lib/routes';
import { paths, toPath } from '../lib/routes';
import { LogoMark } from './LogoMark';
import { NavIcon } from './NavIcon';
import { SidebarNav } from './SidebarNav';
import { cn } from '../lib/cn';

export function AppLayout() {
  const { admin, modules, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateText, setDateText] = useState('');

  const meta = matchRouteMeta(location.pathname);
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
        <header className="topbar">
          <button
            type="button"
            className="btn-menu"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <h1 className="page-heading">{meta.title}</h1>
          <div className="topbar-tools">
            <div className="date-pill hidden sm:flex">
              <NavIcon name="calendar" className="date-pill-icon" />
              <span>{dateText}</span>
            </div>
            <button type="button" className="tool-btn" aria-label="Search">
              <NavIcon name="dashboard" />
            </button>
            <button type="button" className="tool-btn tool-btn-bell" aria-label="Notifications">
              <NavIcon name="bell" />
              <span className="bell-dot" />
            </button>
            <div className="topbar-avatar-wrap hidden md:flex">
              <span className="avatar avatar-sm">{avatar}</span>
              <span className="topbar-admin-label">{displayName}</span>
            </div>
          </div>
        </header>
        <div className="content mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6" id="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
