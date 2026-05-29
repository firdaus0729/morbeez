import { useEffect } from 'react';
import { useConsolePageSearch } from '../context/ConsolePageSearchContext';

/** Bind page list/search state to the shared console topbar search input. */
export function useSyncConsoleSearch(
  value: string,
  onChange: (next: string) => void,
  placeholder: string
) {
  const { register, clearRegistration } = useConsolePageSearch();

  useEffect(() => {
    register({ mode: 'local', value, onChange, placeholder });
    return () => clearRegistration();
  }, [value, placeholder, register, clearRegistration, onChange]);
}

/** Like useSyncConsoleSearch but can disable the topbar search (e.g. pincode tab). */
export function useSyncConsoleSearchMode(
  mode: 'none' | 'local',
  value: string,
  onChange: (next: string) => void,
  placeholder: string
) {
  const { register, clearRegistration } = useConsolePageSearch();

  useEffect(() => {
    if (mode === 'none') {
      register({ mode: 'none' });
    } else {
      register({ mode: 'local', value, onChange, placeholder });
    }
    return () => clearRegistration();
  }, [mode, value, placeholder, register, clearRegistration, onChange]);
}
