import { useEffect } from 'react';
import { useConsolePageSearch } from '../context/ConsolePageSearchContext';

/** Bind page list/search state to the shared console topbar search input. */
export function useSyncConsoleSearch(
  value: string,
  onChange: (next: string) => void,
  placeholder: string
) {
  const ctx = useConsolePageSearch();

  useEffect(() => {
    ctx.register({ mode: 'local', value, onChange, placeholder });
    return () => ctx.clearRegistration();
  }, [ctx, value, onChange, placeholder]);
}
