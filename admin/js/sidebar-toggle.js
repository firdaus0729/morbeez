const STORAGE_KEY = 'morbeez_sidebar_collapsed';

export function isMobileSidebar() {
  return window.matchMedia('(max-width: 900px)').matches;
}

export function applySidebarCollapsedFromStorage() {
  if (!isMobileSidebar() && localStorage.getItem(STORAGE_KEY) === '1') {
    document.body.classList.add('sidebar-collapsed');
  }
}

export function toggleSidebar() {
  if (isMobileSidebar()) {
    document.body.classList.toggle('sidebar-open');
    return;
  }
  document.body.classList.toggle('sidebar-collapsed');
  document.body.classList.remove('sidebar-open');
  localStorage.setItem(STORAGE_KEY, document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
}

export function initSidebarToggle() {
  applySidebarCollapsedFromStorage();

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-sidebar')) {
      e.preventDefault();
      toggleSidebar();
      return;
    }
    if (e.target.closest('#sidebar-backdrop')) {
      document.body.classList.remove('sidebar-open');
    }
  });

  window.addEventListener('resize', () => {
    if (isMobileSidebar()) {
      document.body.classList.remove('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-open');
      applySidebarCollapsedFromStorage();
    }
  });
}
