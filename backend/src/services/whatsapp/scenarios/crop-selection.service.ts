import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import { sendReplyButtonMenu } from '../whatsapp-interactive-menu.service.js';

type CropPickerSenders = {
  text: (phone: string, text: string) => Promise<void>;
  list?: (params: {
    phone: string;
    body: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  }) => Promise<void>;
  buttons?: (params: {
    phone: string;
    body: string;
    buttons: Array<{ id: string; title: string }>;
  }) => Promise<void>;
};

export const DEFAULT_CROP_KEYS = ['ginger', 'banana', 'cardamom', 'pepper'] as const;

const CROP_TITLES: Record<string, string> = {
  ginger: 'Ginger',
  banana: 'Banana',
  cardamom: 'Cardamom',
  pepper: 'Pepper',
};

export type CropPickResult =
  | { kind: 'default'; slug: string }
  | { kind: 'custom'; slug: string; label: string }
  | { kind: 'other' }
  | null;

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function displayLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+plot$/i, '');
  if (!trimmed) return 'Crop';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function plotTitle(label: string): string {
  const base = displayLabel(label);
  return `${base} Plot`;
}

function readCustomCrops(metadata: unknown): Array<{ slug: string; label: string }> {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const raw = meta.customCrops;
  if (!Array.isArray(raw)) return [];
  const out: Array<{ slug: string; label: string }> = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const slug = normalizeSlug(item);
      if (slug) out.push({ slug, label: displayLabel(item) });
      continue;
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const slug = normalizeSlug(String(row.slug ?? row.label ?? ''));
      const label = displayLabel(String(row.label ?? slug));
      if (slug) out.push({ slug, label });
    }
  }
  return out;
}

export const cropSelectionService = {
  normalizeSlug,
  displayLabel,
  plotTitle,

  async getCustomCrops(farmerId: string): Promise<Array<{ slug: string; label: string }>> {
    const { data } = await supabase.from('farmers').select('metadata').eq('id', farmerId).maybeSingle();
    return readCustomCrops(data?.metadata).filter(
      (c) => !DEFAULT_CROP_KEYS.includes(c.slug as (typeof DEFAULT_CROP_KEYS)[number])
    );
  },

  async registerCustomCrop(farmerId: string, cropName: string): Promise<{ slug: string; label: string }> {
    const label = displayLabel(cropName);
    const slug = normalizeSlug(cropName) || 'custom_crop';

    const { data: farmer } = await supabase.from('farmers').select('metadata').eq('id', farmerId).maybeSingle();
    const meta = (farmer?.metadata ?? {}) as Record<string, unknown>;
    const existing = readCustomCrops(meta);
    const merged = [...existing.filter((c) => c.slug !== slug), { slug, label }];
    const defaultSet = new Set<string>(DEFAULT_CROP_KEYS);
    const customOnly = merged.filter((c) => !defaultSet.has(c.slug));

    await supabase
      .from('farmers')
      .update({
        metadata: { ...meta, customCrops: customOnly },
        updated_at: new Date().toISOString(),
      })
      .eq('id', farmerId);

    return { slug, label };
  },

  buildMenuRows(customCrops: Array<{ slug: string; label: string }>): Array<{
    id: string;
    title: string;
    description?: string;
  }> {
    const rows = DEFAULT_CROP_KEYS.map((slug) => ({
      id: `crop.${slug}`,
      title: plotTitle(CROP_TITLES[slug] ?? slug),
    }));

    for (const custom of customCrops) {
      if (rows.some((r) => r.id === `crop.${custom.slug}`)) continue;
      rows.push({ id: `crop.${custom.slug}`, title: plotTitle(custom.label) });
    }

    rows.push({ id: 'crop.other', title: 'Others' });
    return rows;
  },

  parseSelection(text: string): CropPickResult {
    const t = text.trim().toLowerCase();
    if (!t) return null;
    if (t === 'crop.other' || t === 'others' || t === 'other') return { kind: 'other' };

    if (t.startsWith('crop.')) {
      const slug = normalizeSlug(t.slice(5));
      if (!slug || slug === 'other' || slug === 'others') return { kind: 'other' };
      if (DEFAULT_CROP_KEYS.includes(slug as (typeof DEFAULT_CROP_KEYS)[number])) {
        return { kind: 'default', slug };
      }
      return { kind: 'custom', slug, label: displayLabel(slug.replace(/_/g, ' ')) };
    }

    for (const slug of DEFAULT_CROP_KEYS) {
      const name = CROP_TITLES[slug]?.toLowerCase() ?? slug;
      const plot = plotTitle(CROP_TITLES[slug] ?? slug).toLowerCase();
      if (t === slug || t === name || t === plot) {
        return { kind: 'default', slug };
      }
    }

    return null;
  },

  async resolveSelection(farmerId: string, text: string): Promise<CropPickResult> {
    const direct = this.parseSelection(text);
    if (direct) return direct;

    const custom = await this.getCustomCrops(farmerId);
    const lower = text.trim().toLowerCase();
    for (const row of custom) {
      const plot = plotTitle(row.label).toLowerCase();
      if (lower === plot || lower === row.label.toLowerCase() || lower === row.slug.replace(/_/g, ' ')) {
        return { kind: 'custom', slug: row.slug, label: row.label };
      }
    }
    return null;
  },

  async applyCropToPrimaryBlock(farmerId: string, slug: string, label?: string): Promise<void> {
    const cropLabel = label ?? displayLabel(slug.replace(/_/g, ' '));
    const plotLabel = plotTitle(cropLabel);
    const { data: blocks } = await supabase
      .from('farm_blocks')
      .select('id, is_primary')
      .eq('farmer_id', farmerId)
      .is('archived_at', null)
      .order('is_primary', { ascending: false })
      .limit(1);

    const primary = blocks?.[0];
    if (!primary) return;

    await supabase
      .from('farm_blocks')
      .update({
        crop_type: slug,
        crop_name: cropLabel,
        plot_label: plotLabel,
        name: plotLabel,
      })
      .eq('id', primary.id)
      .eq('farmer_id', farmerId);
  },

  async sendCropPicker(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    send: CropPickerSenders;
    body?: string;
  }): Promise<void> {
    const custom = await this.getCustomCrops(params.farmerId);
    const rows = this.buildMenuRows(custom);
    const body =
      params.body ??
      (params.language === 'ml'
        ? 'ഏത് പ്ലോട്ടാണ്?'
        : params.language === 'ta'
          ? 'எந்த ப்ளாட்?'
          : params.language === 'kn'
            ? 'ಯಾವ ಪ್ಲಾಟ್?'
            : params.language === 'hi'
              ? 'कौन सा प्लॉट?'
              : 'Which plot is this for?');

    if (params.send.list) {
      await params.send.list({
        phone: params.phone,
        body,
        buttonText: params.language === 'ml' ? 'പ്ലോട്ട്' : 'Plot',
        sections: [{ title: 'Crop plots', rows }],
      });
      return;
    }

    if (params.send.buttons) {
      await sendReplyButtonMenu({
        to: params.phone,
        body,
        options: rows.map((r) => ({ id: r.id, title: r.title })),
        continuationBody:
          params.language === 'ml' ? 'മറ്റു പ്ലോട്ടുകൾ:' : 'More plots — tap a button:',
        sendButtons: (p) =>
          params.send.buttons!({
            phone: p.to,
            body: p.body,
            buttons: p.buttons,
          }),
      });
      return;
    }

    await params.send.text(params.phone, `${body}\n\n${rows.map((r) => r.title).join(' / ')}`);
  },

  customCropPrompt(language: AdvisoryLanguage): string {
    const map: Record<AdvisoryLanguage, string> = {
      en: 'Please type your crop name (we will save it as a new plot).',
      ml: 'നിങ്ങളുടെ വിളയുടെ പേര് ടൈപ്പ് ചെയ്യുക (പുതിയ പ്ലോട്ടായി സേവ് ചെയ്യും).',
      ta: 'உங்கள் பயிர் பெயரை தட்டச்சு செய்யவும் (புதிய ப்ளாட்டாக சேமிக்கப்படும்).',
      kn: 'ನಿಮ್ಮ ಬೆಳೆಯ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ (ಹೊಸ ಪ್ಲಾಟ್ ಆಗಿ ಉಳಿಸಲಾಗುತ್ತದೆ).',
      hi: 'अपनी फसल का नाम लिखें (नया प्लॉट के रूप में सेव होगा)।',
    };
    return map[language] ?? map.en;
  },
};
