import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { defaultsForPage, type PageSearchMode } from '../lib/console-page-search';

export type GlobalSearchHit = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  hash: string;
  meta?: Record<string, unknown>;
};

export type LocalPageSearchRegistration = {
  mode: 'local';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export type PageSearchRegistration =
  | { mode: 'none' }
  | { mode: 'global'; placeholder: string }
  | LocalPageSearchRegistration;

type ConsolePageSearchContextValue = {
  mode: PageSearchMode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  globalResults: GlobalSearchHit[];
  globalLoading: boolean;
  globalOpen: boolean;
  setGlobalOpen: (open: boolean) => void;
  register: (reg: PageSearchRegistration) => void;
  clearRegistration: () => void;
};

const ConsolePageSearchContext = createContext<ConsolePageSearchContextValue | null>(null);

function mergeHits(results: {
  farmers: GlobalSearchHit[];
  leads: GlobalSearchHit[];
  orders: GlobalSearchHit[];
}): GlobalSearchHit[] {
  return [...results.farmers, ...results.leads, ...results.orders].slice(0, 12);
}

export function ConsolePageSearchProvider({
  pageKey,
  children,
}: {
  pageKey: string;
  children: ReactNode;
}) {
  const defaults = defaultsForPage(pageKey);
  const [registration, setRegistration] = useState<PageSearchRegistration | null>(null);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<GlobalSearchHit[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalOpen, setGlobalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const active = registration ?? {
    mode: defaults.mode,
    ...(defaults.mode === 'global'
      ? { placeholder: defaults.placeholder ?? 'Search…' }
      : defaults.mode === 'local'
        ? {
            mode: 'local' as const,
            value: '',
            onChange: () => {},
            placeholder: defaults.placeholder ?? 'Search…',
          }
        : { mode: 'none' as const }),
  };

  const mode = active.mode;
  const placeholder =
    active.mode === 'none'
      ? ''
      : active.mode === 'global'
        ? active.placeholder
        : active.placeholder;

  const localReg = registration?.mode === 'local' ? registration : null;
  const value =
    mode === 'local' && localReg ? localReg.value : mode === 'global' ? globalQuery : '';
  const onChange = useCallback(
    (v: string) => {
      if (mode === 'local' && localReg) localReg.onChange(v);
      else if (mode === 'global') {
        setGlobalQuery(v);
        setGlobalOpen(v.trim().length >= 2);
      }
    },
    [mode, localReg]
  );

  const register = useCallback((reg: PageSearchRegistration) => {
    setRegistration(reg);
  }, []);

  const clearRegistration = useCallback(() => {
    setRegistration(null);
    setGlobalQuery('');
    setGlobalResults([]);
    setGlobalOpen(false);
  }, []);

  useEffect(() => {
    setGlobalQuery('');
    setGlobalResults([]);
    setGlobalOpen(false);
    setRegistration(null);
  }, [pageKey]);

  useEffect(() => {
    if (mode !== 'global') return;
    const term = globalQuery.trim();
    if (term.length < 2) {
      setGlobalResults([]);
      setGlobalLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setGlobalLoading(true);
      api<{
        ok: boolean;
        results: { farmers: GlobalSearchHit[]; leads: GlobalSearchHit[]; orders: GlobalSearchHit[] };
      }>(`/console/api/v1/search?q=${encodeURIComponent(term)}`, { signal: ac.signal })
        .then((d) => setGlobalResults(mergeHits(d.results ?? { farmers: [], leads: [], orders: [] })))
        .catch((e) => {
          if (e instanceof Error && e.name === 'AbortError') return;
          setGlobalResults([]);
        })
        .finally(() => setGlobalLoading(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [mode, globalQuery]);

  const value_ctx = useMemo(
    () => ({
      mode,
      placeholder,
      value,
      onChange,
      globalResults,
      globalLoading,
      globalOpen,
      setGlobalOpen,
      register,
      clearRegistration,
    }),
    [
      mode,
      placeholder,
      value,
      onChange,
      globalResults,
      globalLoading,
      globalOpen,
      register,
      clearRegistration,
    ]
  );

  return (
    <ConsolePageSearchContext.Provider value={value_ctx}>{children}</ConsolePageSearchContext.Provider>
  );
}

export function useConsolePageSearch() {
  const ctx = useContext(ConsolePageSearchContext);
  if (!ctx) throw new Error('useConsolePageSearch requires ConsolePageSearchProvider');
  return ctx;
}

/** Pages with local search register their state; unregisters on unmount. */
export function useRegisterPageSearch(reg: PageSearchRegistration | null) {
  const ctx = useConsolePageSearch();
  const regRef = useRef(reg);
  regRef.current = reg;

  useEffect(() => {
    const current = regRef.current;
    if (!current || current.mode === 'none') {
      ctx.clearRegistration();
      return () => ctx.clearRegistration();
    }
    ctx.register(current);
    return () => ctx.clearRegistration();
  }, [
    ctx,
    reg?.mode,
    reg?.mode === 'local' ? reg.value : '',
    reg?.mode === 'local' ? reg.placeholder : '',
    reg?.mode === 'global' ? reg.placeholder : '',
  ]);
}
