export function formatInr(amount: number): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatInrFull(amount: number): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatTrend(pct: number): { text: string; up: boolean } {
  const n = Number(pct);
  if (Number.isNaN(n)) return { text: '—', up: true };
  const up = n >= 0;
  return { text: `${up ? '+' : ''}${n}%`, up };
}

export function initials(name: string | undefined): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    operations: 'Operations',
    manager: 'Manager',
    viewer: 'Viewer',
    agronomist: 'Agronomist',
    telecaller: 'Telecaller',
  };
  return map[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
