import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type CrmNotification = { id: string; message: string; at: string };

export type TelecallerHeaderState = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  canWrite: boolean;
  onAddLead: () => void;
  selectedPhone: string | null;
  unreadNotifications: number;
  notifications: CrmNotification[];
  showNotifications: boolean;
  setShowNotifications: Dispatch<SetStateAction<boolean>>;
  onToggleNotifications: () => void;
};

const defaultState: TelecallerHeaderState = {
  search: '',
  setSearch: () => {},
  canWrite: false,
  onAddLead: () => {},
  selectedPhone: null,
  unreadNotifications: 0,
  notifications: [],
  showNotifications: false,
  setShowNotifications: () => {},
  onToggleNotifications: () => {},
};

type TelecallerHeaderContextValue = TelecallerHeaderState & {
  patchHeader: (patch: Partial<TelecallerHeaderState>) => void;
};

const TelecallerHeaderContext = createContext<TelecallerHeaderContextValue | null>(null);

export function TelecallerHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TelecallerHeaderState>(defaultState);

  const patchHeader = useCallback((patch: Partial<TelecallerHeaderState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      patchHeader,
    }),
    [state, patchHeader]
  );

  return (
    <TelecallerHeaderContext.Provider value={value}>{children}</TelecallerHeaderContext.Provider>
  );
}

export function useTelecallerHeader() {
  const ctx = useContext(TelecallerHeaderContext);
  if (!ctx) throw new Error('useTelecallerHeader must be used within TelecallerHeaderProvider');
  return ctx;
}

export function useTelecallerHeaderOptional() {
  return useContext(TelecallerHeaderContext);
}
