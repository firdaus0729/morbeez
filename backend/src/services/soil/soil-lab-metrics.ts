/** Standard soil lab panel — stored in crm_soil_reports.metrics */

export type SoilMetricValue = { value: string; unit: string };
export const SOIL_TYPE_OPTIONS = [
  'Sandy',
  'Loamy',
  'Clay',
  'Laterite/Red Soil',
  'Black Soil',
] as const;

export type SoilTypeOption = (typeof SOIL_TYPE_OPTIONS)[number];

export type SoilLabMetrics = {
  version: 2;
  soilType?: string;
  macro: Record<string, SoilMetricValue>;
  micro: Record<string, SoilMetricValue>;
};

export type SoilFieldDef = {
  key: string;
  label: string;
  unit: string;
  group: 'macro' | 'micro';
};

export const SOIL_MACRO_FIELDS: SoilFieldDef[] = [
  { key: 'ph', label: 'pH', unit: '', group: 'macro' },
  { key: 'ec', label: 'EC', unit: 'dS/m', group: 'macro' },
  { key: 'organicCarbon', label: 'Organic Carbon', unit: '%', group: 'macro' },
  { key: 'nitrogen', label: 'Nitrogen (N)', unit: 'kg/ha', group: 'macro' },
  { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'kg/ha', group: 'macro' },
  { key: 'potassium', label: 'Potassium (K)', unit: 'kg/ha', group: 'macro' },
  { key: 'calcium', label: 'Calcium (Ca)', unit: 'ppm', group: 'macro' },
  { key: 'magnesium', label: 'Magnesium (Mg)', unit: 'ppm', group: 'macro' },
  { key: 'sulfur', label: 'Sulfur (S)', unit: 'ppm', group: 'macro' },
];

export const SOIL_MICRO_FIELDS: SoilFieldDef[] = [
  { key: 'zinc', label: 'Zinc (Zn)', unit: 'ppm', group: 'micro' },
  { key: 'boron', label: 'Boron (B)', unit: 'ppm', group: 'micro' },
  { key: 'iron', label: 'Iron (Fe)', unit: 'ppm', group: 'micro' },
  { key: 'manganese', label: 'Manganese (Mn)', unit: 'ppm', group: 'micro' },
  { key: 'copper', label: 'Copper (Cu)', unit: 'ppm', group: 'micro' },
];

export const ALL_SOIL_FIELDS = [...SOIL_MACRO_FIELDS, ...SOIL_MICRO_FIELDS];

export function emptySoilLabMetrics(): SoilLabMetrics {
  const macro: Record<string, SoilMetricValue> = {};
  const micro: Record<string, SoilMetricValue> = {};
  for (const f of SOIL_MACRO_FIELDS) macro[f.key] = { value: '', unit: f.unit };
  for (const f of SOIL_MICRO_FIELDS) micro[f.key] = { value: '', unit: f.unit };
  return { version: 2, macro, micro };
}

export function normalizeSoilMetrics(raw: unknown): SoilLabMetrics {
  const base = emptySoilLabMetrics();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;

  if (o.version === 2 && o.macro && o.micro) {
    if (typeof o.soilType === 'string' && o.soilType.trim()) {
      base.soilType = o.soilType.trim();
    }
    const macro = o.macro as Record<string, SoilMetricValue>;
    const micro = o.micro as Record<string, SoilMetricValue>;
    for (const f of SOIL_MACRO_FIELDS) {
      const v = macro[f.key];
      if (v?.value != null) base.macro[f.key] = { value: String(v.value), unit: f.unit };
    }
    for (const f of SOIL_MICRO_FIELDS) {
      const v = micro[f.key];
      if (v?.value != null) base.micro[f.key] = { value: String(v.value), unit: f.unit };
    }
    return base;
  }

  const legacyMap: Record<string, string> = {
    ph: 'ph',
    ec: 'ec',
    organicCarbon: 'organicCarbon',
    nitrogen: 'nitrogen',
    phosphorus: 'phosphorus',
    potassium: 'potassium',
  };
  for (const [legacyKey, targetKey] of Object.entries(legacyMap)) {
    const entry = o[legacyKey] as { value?: string } | undefined;
    if (entry?.value && targetKey in base.macro) {
      base.macro[targetKey].value = String(entry.value).replace(/\s*(dS\/m|%|kg\/ha|ppm).*$/i, '').trim();
    }
  }
  return base;
}

export function buildMetricsFromForm(
  macro: Record<string, string>,
  micro: Record<string, string>,
  soilType?: string
): SoilLabMetrics {
  const metrics = emptySoilLabMetrics();
  const st = soilType?.trim();
  if (st) metrics.soilType = st;
  for (const f of SOIL_MACRO_FIELDS) {
    const v = macro[f.key]?.trim();
    if (v) metrics.macro[f.key] = { value: v, unit: f.unit };
  }
  for (const f of SOIL_MICRO_FIELDS) {
    const v = micro[f.key]?.trim();
    if (v) metrics.micro[f.key] = { value: v, unit: f.unit };
  }
  return metrics;
}

export function metricsToForm(metrics: SoilLabMetrics): {
  macro: Record<string, string>;
  micro: Record<string, string>;
  soilType: string;
} {
  const macro: Record<string, string> = {};
  const micro: Record<string, string> = {};
  for (const f of SOIL_MACRO_FIELDS) macro[f.key] = metrics.macro[f.key]?.value ?? '';
  for (const f of SOIL_MICRO_FIELDS) micro[f.key] = metrics.micro[f.key]?.value ?? '';
  return { macro, micro, soilType: metrics.soilType ?? '' };
}

/** Parse comma-separated numbers for WhatsApp (macro: 9 values, micro: 5). */
export function parseCommaValues(text: string, expected: number): string[] | null {
  const parts = text
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < expected) return null;
  return parts.slice(0, expected);
}

export function applyMacroValues(metrics: SoilLabMetrics, values: string[]): SoilLabMetrics {
  const next = { ...metrics, macro: { ...metrics.macro } };
  SOIL_MACRO_FIELDS.forEach((f, i) => {
    if (values[i]) next.macro[f.key] = { value: values[i], unit: f.unit };
  });
  return next;
}

export function applyMicroValues(metrics: SoilLabMetrics, values: string[]): SoilLabMetrics {
  const next = { ...metrics, micro: { ...metrics.micro } };
  SOIL_MICRO_FIELDS.forEach((f, i) => {
    if (values[i]) next.micro[f.key] = { value: values[i], unit: f.unit };
  });
  return next;
}

export function formatMetricLine(_f: SoilFieldDef, m: SoilMetricValue | undefined): string {
  if (!m?.value) return '—';
  return m.unit ? `${m.value} ${m.unit}` : m.value;
}

export function formatSoilSummary(metrics: SoilLabMetrics, maxLines = 6): string {
  const lines: string[] = [];
  if (metrics.soilType) lines.push(`Soil type: ${metrics.soilType}`);
  for (const field of SOIL_MACRO_FIELDS) {
    const v = metrics.macro[field.key];
    if (v?.value) lines.push(`${field.label}: ${formatMetricLine(field, v)}`);
    if (lines.length >= maxLines) break;
  }
  return lines.join('\n') || 'Soil test saved';
}

export function macroPrompt(lang: string): string {
  if (lang === 'ml') {
    return (
      'മാക്രോ ന്യൂട്രിയന്റ്സ് — 9 സംഖ്യകൾ കോമയിൽ അയയ്ക്കുക:\n' +
      'pH, EC (dS/m), Organic Carbon (%), N, P, K (kg/ha), Ca, Mg, S (ppm)\n' +
      'ഉദാ: 6.2, 0.42, 0.54, 245, 18, 180, 1200, 400, 15'
    );
  }
  return (
    'Macro nutrients — reply with 9 numbers separated by commas:\n' +
    'pH, EC (dS/m), Organic Carbon (%), N, P, K (kg/ha), Ca, Mg, S (ppm)\n' +
    'Example: 6.2, 0.42, 0.54, 245, 18, 180, 1200, 400, 15'
  );
}

export function microPrompt(lang: string): string {
  if (lang === 'ml') {
    return (
      'മൈക്രോ ന്യൂട്രിയന്റ്സ് — 5 സംഖ്യകൾ കോമയിൽ അയയ്ക്കുക:\n' +
      'Zn, B, Fe, Mn, Cu (ppm)\n' +
      'ഉദാ: 1.2, 0.5, 4.5, 3.1, 0.8'
    );
  }
  return (
    'Micro nutrients — reply with 5 numbers separated by commas:\n' +
    'Zn, B, Fe, Mn, Cu (ppm)\n' +
    'Example: 1.2, 0.5, 4.5, 3.1, 0.8'
  );
}

export function soilTypePrompt(lang: string): string {
  if (lang === 'ml') {
    return 'മണ്ണിന്റെ തരം — ഒരു നമ്പർ അയയ്ക്കുക:\n1 Sandy\n2 Loamy\n3 Clay\n4 Laterite/Red Soil\n5 Black Soil';
  }
  return (
    'Soil type — reply with number or name:\n' +
    '1 Sandy\n2 Loamy\n3 Clay\n4 Laterite/Red Soil\n5 Black Soil'
  );
}

export function parseSoilType(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const byNum: Record<string, SoilTypeOption> = {
    '1': 'Sandy',
    '2': 'Loamy',
    '3': 'Clay',
    '4': 'Laterite/Red Soil',
    '5': 'Black Soil',
  };
  if (byNum[t]) return byNum[t];
  for (const opt of SOIL_TYPE_OPTIONS) {
    if (t === opt.toLowerCase() || opt.toLowerCase().includes(t)) return opt;
  }
  if (t.includes('sandy')) return 'Sandy';
  if (t.includes('loam')) return 'Loamy';
  if (t.includes('clay')) return 'Clay';
  if (t.includes('laterite') || t.includes('red')) return 'Laterite/Red Soil';
  if (t.includes('black')) return 'Black Soil';
  return null;
}

export function hasAnyMetricValue(metrics: SoilLabMetrics): boolean {
  if (metrics.soilType?.trim()) return true;
  return [...Object.values(metrics.macro), ...Object.values(metrics.micro)].some((m) => m.value?.trim());
}
