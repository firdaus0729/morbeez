import { useNavigate } from 'react-router-dom';
import type { GlobalSearchHit } from '../context/ConsolePageSearchContext';
import { paths, toPath } from '../lib/routes';

type Props = {
  results: GlobalSearchHit[];
  loading: boolean;
  open: boolean;
  query: string;
  onClose: () => void;
};

function pathForHit(hit: GlobalSearchHit): string {
  if (hit.type === 'lead') return toPath(paths.telecaller);
  if (hit.type === 'farmer') return toPath(paths.commerce);
  if (hit.type === 'order') return toPath(paths.commerce);
  if (hit.hash.startsWith('/')) return hit.hash;
  return toPath(hit.hash);
}

const TYPE_LABEL: Record<string, string> = {
  farmer: 'Farmer',
  lead: 'Lead',
  order: 'Order',
};

export function GlobalSearchDropdown({ results, loading, open, query, onClose }: Props) {
  const navigate = useNavigate();

  if (!open || query.trim().length < 2) return null;

  function go(hit: GlobalSearchHit) {
    onClose();
    navigate(pathForHit(hit));
  }

  return (
    <div className="console-global-search-dropdown" role="listbox">
      {loading ? <p className="console-global-search-empty">Searching…</p> : null}
      {!loading && results.length === 0 ? (
        <p className="console-global-search-empty">No matches for “{query.trim()}”</p>
      ) : null}
      {!loading
        ? results.map((hit) => (
            <button
              key={`${hit.type}-${hit.id}`}
              type="button"
              role="option"
              className="console-global-search-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(hit)}
            >
              <span className="console-global-search-type">{TYPE_LABEL[hit.type] ?? hit.type}</span>
              <span className="console-global-search-title">{hit.title}</span>
              {hit.subtitle ? (
                <span className="console-global-search-sub">{hit.subtitle}</span>
              ) : null}
            </button>
          ))
        : null}
    </div>
  );
}
