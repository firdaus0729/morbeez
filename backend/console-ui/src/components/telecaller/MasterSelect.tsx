import { useState } from 'react';
import { useCrmMasters } from '../../lib/useCrmMasters';
import { inputClass } from '../Modal';

type Props = {
  masterType: string;
  label: string;
  value: string;
  onChange: (id: string, name: string) => void;
  parentId?: string | null;
  allowAdd?: boolean;
  className?: string;
};

export function MasterSelect({
  masterType,
  label,
  value,
  onChange,
  parentId,
  allowAdd = true,
  className = inputClass,
}: Props) {
  const { items, loading, createMaster } = useCrmMasters(masterType, parentId);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const name = window.prompt(`Add new ${label.toLowerCase()}`);
    if (!name?.trim()) return;
    setAdding(true);
    try {
      const item = await createMaster(name.trim());
      onChange(item.id, item.name);
    } finally {
      setAdding(false);
    }
  }

  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <div className="mt-1 flex gap-2">
        <select
          className={`${className} flex-1`}
          value={value}
          disabled={loading || adding}
          onChange={(e) => {
            const id = e.target.value;
            if (id === '__add__') {
              handleAdd();
              return;
            }
            const item = items.find((i) => i.id === id);
            onChange(id, item?.name ?? '');
          }}
        >
          <option value="">— Select —</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
          {allowAdd ? <option value="__add__">+ Add new…</option> : null}
        </select>
      </div>
    </label>
  );
}
