import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

/**
 * Renders matched child routes. The key must be on <Outlet /> itself (not a wrapper
 * around useOutlet()) so React Router 7 remounts page components on navigation.
 */
export function RoutedPageOutlet() {
  const location = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="content console-page-content" id="main-content">
      <Outlet key={location.pathname} />
    </div>
  );
}
