/** Mirror of backend soil-lab-metrics field definitions (UI only). */

export type SoilFieldDef = { key: string; label: string; unit: string };

export const SOIL_MACRO_FIELDS: SoilFieldDef[] = [
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'ec', label: 'EC', unit: 'dS/m' },
  { key: 'organicCarbon', label: 'Organic Carbon', unit: '%' },
  { key: 'nitrogen', label: 'Nitrogen (N)', unit: 'kg/ha' },
  { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'kg/ha' },
  { key: 'potassium', label: 'Potassium (K)', unit: 'kg/ha' },
  { key: 'calcium', label: 'Calcium (Ca)', unit: 'ppm' },
  { key: 'magnesium', label: 'Magnesium (Mg)', unit: 'ppm' },
  { key: 'sulfur', label: 'Sulfur (S)', unit: 'ppm' },
];

export const SOIL_MICRO_FIELDS: SoilFieldDef[] = [
  { key: 'zinc', label: 'Zinc (Zn)', unit: 'ppm' },
  { key: 'boron', label: 'Boron (B)', unit: 'ppm' },
  { key: 'iron', label: 'Iron (Fe)', unit: 'ppm' },
  { key: 'manganese', label: 'Manganese (Mn)', unit: 'ppm' },
  { key: 'copper', label: 'Copper (Cu)', unit: 'ppm' },
];

export const SOIL_TYPE_OPTIONS = [
  'Sandy',
  'Loamy',
  'Clay',
  'Laterite/Red Soil',
  'Black Soil',
] as const;

export type SoilLabMetrics = {
  version?: number;
  soilType?: string;
  macro: Record<string, { value: string; unit: string }>;
  micro: Record<string, { value: string; unit: string }>;
};

export function emptySoilForm(): {
  macro: Record<string, string>;
  micro: Record<string, string>;
  soilType: string;
} {
  const macro: Record<string, string> = {};
  const micro: Record<string, string> = {};
  for (const f of SOIL_MACRO_FIELDS) macro[f.key] = '';
  for (const f of SOIL_MICRO_FIELDS) micro[f.key] = '';
  return { macro, micro, soilType: '' };
}

export function metricsToForm(metrics: SoilLabMetrics | undefined): {
  macro: Record<string, string>;
  micro: Record<string, string>;
  soilType: string;
} {
  const base = emptySoilForm();
  if (!metrics) return base;
  base.soilType = metrics.soilType ?? '';
  for (const f of SOIL_MACRO_FIELDS) {
    base.macro[f.key] = metrics.macro?.[f.key]?.value ?? '';
  }
  for (const f of SOIL_MICRO_FIELDS) {
    base.micro[f.key] = metrics.micro?.[f.key]?.value ?? '';
  }
  return base;
}

export function formToMetricsPayload(
  macro: Record<string, string>,
  micro: Record<string, string>,
  soilType: string
) {
  const out: SoilLabMetrics = { version: 2, macro: {}, micro: {} };
  const st = soilType.trim();
  if (st) out.soilType = st;
  for (const f of SOIL_MACRO_FIELDS) {
    const v = macro[f.key]?.trim();
    if (v) out.macro[f.key] = { value: v, unit: f.unit };
  }
  for (const f of SOIL_MICRO_FIELDS) {
    const v = micro[f.key]?.trim();
    if (v) out.micro[f.key] = { value: v, unit: f.unit };
  }
  return out;
}
