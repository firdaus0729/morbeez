import { Field, inputClass } from '../Modal';

export const CROP_PRESETS = [
  { key: 'ginger', label: 'Ginger' },
  { key: 'cardamom', label: 'Cardamom' },
  { key: 'banana', label: 'Banana' },
  { key: 'pepper', label: 'Pepper' },
  { key: '__new__', label: 'Add new' },
] as const;

export type CropBlockFormValue = {
  id?: string;
  blockName: string;
  cropKey: string;
  customCropName: string;
  acreage: string;
  plantingDate: string;
};

export function emptyCropBlock(): CropBlockFormValue {
  return {
    blockName: '',
    cropKey: 'ginger',
    customCropName: '',
    acreage: '',
    plantingDate: '',
  };
}

export function cropNameFromBlock(b: CropBlockFormValue): string {
  if (b.cropKey === '__new__') return b.customCropName.trim();
  const preset = CROP_PRESETS.find((p) => p.key === b.cropKey);
  return preset?.label ?? b.cropKey;
}

export function cropKeyFromName(cropName: string): Pick<CropBlockFormValue, 'cropKey' | 'customCropName'> {
  const lower = cropName.trim().toLowerCase();
  if (!lower) return { cropKey: 'ginger', customCropName: '' };
  for (const p of CROP_PRESETS) {
    if (p.key === '__new__') continue;
    if (lower === p.key || lower === p.label.toLowerCase()) {
      return { cropKey: p.key, customCropName: '' };
    }
  }
  return { cropKey: '__new__', customCropName: cropName.trim() };
}

export function blockFromApi(row: {
  id?: string;
  blockName?: string;
  name?: string;
  cropName: string;
  acreage?: string | number | null;
  plantingDate?: string | null;
}): CropBlockFormValue {
  const { cropKey, customCropName } = cropKeyFromName(row.cropName);
  const blockName = row.blockName ?? row.name ?? '';
  return {
    id: row.id,
    blockName: blockName === '—' ? '' : blockName,
    cropKey,
    customCropName,
    acreage: row.acreage != null && row.acreage !== '—' ? String(row.acreage) : '',
    plantingDate: row.plantingDate ?? '',
  };
}

export function toApiCropBlock(b: CropBlockFormValue): {
  id?: string;
  blockName: string;
  cropName: string;
  acreage?: number;
  plantingDate?: string;
} | null {
  const cropName = cropNameFromBlock(b);
  if (!cropName) return null;
  const blockName = b.blockName.trim() || `${cropName} Plot`;
  return {
    id: b.id,
    blockName,
    cropName,
    acreage: b.acreage.trim() ? Number(b.acreage) : undefined,
    plantingDate: b.plantingDate || undefined,
  };
}

type Props = {
  blocks: CropBlockFormValue[];
  onChange: (blocks: CropBlockFormValue[]) => void;
  showLabels?: boolean;
};

export function CropBlockFields({ blocks, onChange, showLabels = true }: Props) {
  function updateAt(idx: number, patch: Partial<CropBlockFormValue>) {
    const next = [...blocks];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => (
        <div key={b.id ?? `new-${idx}`} className="rounded border border-slate-100 p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={showLabels ? 'Block name' : undefined}>
              <input
                className={inputClass}
                placeholder="e.g. Ginger Plot"
                value={b.blockName}
                onChange={(e) => updateAt(idx, { blockName: e.target.value })}
              />
            </Field>
            <Field label={showLabels ? 'Crop' : undefined}>
              <select
                className={inputClass}
                value={b.cropKey}
                onChange={(e) => updateAt(idx, { cropKey: e.target.value })}
              >
                {CROP_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={showLabels ? 'Acre' : undefined}>
              <input
                className={inputClass}
                placeholder="Acreage"
                inputMode="decimal"
                value={b.acreage}
                onChange={(e) => updateAt(idx, { acreage: e.target.value })}
              />
            </Field>
            <Field label={showLabels ? 'Planted date' : undefined}>
              <input
                type="date"
                className={inputClass}
                value={b.plantingDate}
                onChange={(e) => updateAt(idx, { plantingDate: e.target.value })}
              />
            </Field>
          </div>
          {b.cropKey === '__new__' ? (
            <div className="mt-2">
              <Field label={showLabels ? 'New crop name' : undefined}>
                <input
                  className={inputClass}
                  placeholder="Type crop name"
                  value={b.customCropName}
                  onChange={(e) => updateAt(idx, { customCropName: e.target.value })}
                />
              </Field>
            </div>
          ) : null}
          {blocks.length > 1 ? (
            <button
              type="button"
              className="mt-2 text-xs text-red-600 hover:underline"
              onClick={() => onChange(blocks.filter((_, i) => i !== idx))}
            >
              Remove block
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
