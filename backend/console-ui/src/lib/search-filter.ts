/** Client-side filter: true when query empty or any part contains query (case-insensitive). */
export function matchesSearch(
  query: string,
  ...parts: (string | number | null | undefined)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = parts
    .filter((p) => p != null && p !== '')
    .map((p) => String(p).toLowerCase())
    .join(' ');
  return hay.includes(q);
}
