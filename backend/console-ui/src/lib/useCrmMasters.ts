import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export type MasterItem = { id: string; name: string; master_type?: string };

const cache = new Map<string, MasterItem[]>();

export function useCrmMasters(masterType: string, parentId?: string | null) {
  const key = `${masterType}:${parentId ?? ''}`;
  const [items, setItems] = useState<MasterItem[]>(cache.get(key) ?? []);
  const [loading, setLoading] = useState(!cache.has(key));

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: masterType });
      if (parentId) params.set('parentId', parentId);
      const data = await api<{ ok: boolean; items: MasterItem[] }>(
        `/console/api/v1/os/telecaller/masters?${params}`
      );
      const list = data.items ?? [];
      cache.set(key, list);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [masterType, parentId, key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createMaster = useCallback(
    async (name: string) => {
      const data = await api<{ ok: boolean; item: MasterItem }>(
        '/console/api/v1/os/telecaller/masters',
        {
          method: 'POST',
          body: JSON.stringify({
            masterType,
            name: name.trim(),
            parentId: parentId ?? null,
          }),
        }
      );
      cache.delete(key);
      await reload();
      return data.item;
    },
    [masterType, parentId, key, reload]
  );

  return { items, loading, reload, createMaster };
}
