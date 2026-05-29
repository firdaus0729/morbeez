import { useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

/**
 * Renders the active route via useOutlet() and remounts page content on each navigation.
 * Using location.key (not pathname alone) avoids stale views when switching sidebar links.
 */
export function ConsoleOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location.key]);

  return (
    <div className="content console-page-content" id="main-content">
      <div key={location.key} className="console-page-outlet">
        {outlet}
      </div>
    </div>
  );
}
