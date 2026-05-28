import { useRef } from 'react';
import { matchRouteMeta } from '../lib/routes';
import { useConsolePageSearch } from '../context/ConsolePageSearchContext';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';
import { WorkspaceHeader } from './WorkspaceHeader';

type Props = {
  pathname: string;
  dateText: string;
  onOpenMenu: () => void;
  onLogout: () => void;
};

export function ConsoleTopbar({ pathname, dateText, onOpenMenu, onLogout }: Props) {
  const meta = matchRouteMeta(pathname);
  const searchCtx = useConsolePageSearch();
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const showSearch = searchCtx.mode !== 'none';

  return (
    <WorkspaceHeader
      title={meta.title}
      onOpenMenu={onOpenMenu}
      onLogout={onLogout}
      search={
        showSearch
          ? {
              id: `search-${meta.pageKey}`,
              value: searchCtx.value,
              onChange: searchCtx.onChange,
              placeholder: searchCtx.placeholder,
              onFocus: () => {
                if (searchCtx.mode === 'global' && searchCtx.value.trim().length >= 2) {
                  searchCtx.setGlobalOpen(true);
                }
              },
              onBlur: () => {
                window.setTimeout(() => searchCtx.setGlobalOpen(false), 150);
              },
              dropdown:
                searchCtx.mode === 'global' ? (
                  <div ref={searchWrapRef} className="console-global-search-wrap">
                    <GlobalSearchDropdown
                      results={searchCtx.globalResults}
                      loading={searchCtx.globalLoading}
                      open={searchCtx.globalOpen}
                      query={searchCtx.value}
                      onClose={() => searchCtx.setGlobalOpen(false)}
                    />
                  </div>
                ) : undefined,
            }
          : undefined
      }
      showDate
      dateText={dateText}
      notificationCount={0}
    />
  );
}
