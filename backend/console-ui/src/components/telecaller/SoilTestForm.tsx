import { inputClass } from '../Modal';
import { SOIL_MACRO_FIELDS, SOIL_MICRO_FIELDS, SOIL_TYPE_OPTIONS } from './soilLabMetrics';

type Props = {
  macro: Record<string, string>;
  micro: Record<string, string>;
  soilType: string;
  onMacroChange: (macro: Record<string, string>) => void;
  onMicroChange: (micro: Record<string, string>) => void;
  onSoilTypeChange: (soilType: string) => void;
  disabled?: boolean;
};

function FieldGrid({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: typeof SOIL_MACRO_FIELDS;
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.key} className="block text-xs">
          <span className="font-medium text-slate-700">
            {f.label}
            {f.unit ? <span className="font-normal text-slate-400"> ({f.unit})</span> : null}
          </span>
          <input
            type="text"
            inputMode="decimal"
            className={`${inputClass} mt-0.5`}
            placeholder={f.unit || 'Value'}
            value={values[f.key] ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

export function SoilTestForm({
  macro,
  micro,
  soilType,
  onMacroChange,
  onMicroChange,
  onSoilTypeChange,
  disabled,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Macro</h5>
        <FieldGrid fields={SOIL_MACRO_FIELDS} values={macro} onChange={onMacroChange} disabled={disabled} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Micro elements</h5>
        <FieldGrid fields={SOIL_MICRO_FIELDS} values={micro} onChange={onMicroChange} disabled={disabled} />
        <label className="mt-3 block text-xs">
          <span className="font-medium text-slate-700">Soil type</span>
          <select
            className={`${inputClass} mt-0.5`}
            value={soilType}
            disabled={disabled}
            onChange={(e) => onSoilTypeChange(e.target.value)}
          >
            <option value="">Select soil type</option>
            {SOIL_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}

export function SoilTestReadout({
  metrics,
}: {
  metrics: {
    soilType?: string;
    macro: Record<string, { value: string; unit: string }>;
    micro: Record<string, { value: string; unit: string }>;
  };
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 text-xs">
      {metrics.soilType ? (
        <p className="lg:col-span-2 rounded border border-slate-100 bg-white px-2 py-1.5 text-slate-800">
          <span className="text-slate-500">Soil type: </span>
          <span className="font-medium">{metrics.soilType}</span>
        </p>
      ) : null}
      <div>
        <p className="mb-1 font-semibold text-slate-600">Macro</p>
        <dl className="space-y-0.5">
          {SOIL_MACRO_FIELDS.map((f) => {
            const m = metrics.macro[f.key];
            if (!m?.value) return null;
            return (
              <div key={f.key} className="flex justify-between gap-2">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-medium text-slate-800">
                  {m.value}
                  {m.unit ? ` ${m.unit}` : ''}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <div>
        <p className="mb-1 font-semibold text-slate-600">Micro</p>
        <dl className="space-y-0.5">
          {SOIL_MICRO_FIELDS.map((f) => {
            const m = metrics.micro[f.key];
            if (!m?.value) return null;
            return (
              <div key={f.key} className="flex justify-between gap-2">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-medium text-slate-800">
                  {m.value}
                  {m.unit ? ` ${m.unit}` : ''}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
