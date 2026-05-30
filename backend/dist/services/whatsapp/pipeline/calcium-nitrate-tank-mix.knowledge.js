/**
 * Morbeez verified Calcium Nitrate tank-mix chart (training source for spray_compatibility_rules).
 * Anchor product is always Calcium Nitrate; pairs are stored in both directions at lookup time.
 */
export const CALCIUM_NITRATE_PRODUCT = 'Calcium Nitrate';
/** Normalized tokens → canonical product label for matching */
export const PRODUCT_ALIASES = {
    'calcium nitrate': CALCIUM_NITRATE_PRODUCT,
    'calcium nitrate 15 5 0 0': CALCIUM_NITRATE_PRODUCT,
    urea: 'Urea',
    'potassium nitrate': 'Potassium Nitrate',
    kno3: 'Potassium Nitrate',
    '13 0 45': 'Potassium Nitrate',
    boron: 'Boron (Solubor)',
    solubor: 'Boron (Solubor)',
    'amino acid': 'Amino Acids',
    'amino acids': 'Amino Acids',
    'protein hydrolysate': 'Protein Hydrolysate',
    'seaweed extract': 'Light Seaweed Extract',
    'light seaweed extract': 'Light Seaweed Extract',
    'fulvic acid': 'Fulvic Acid',
    edta: 'Chelated Micronutrients (EDTA)',
    'chelated micronutrients': 'Chelated Micronutrients (EDTA)',
    map: 'MAP (12-61-0)',
    '12 61 0': 'MAP (12-61-0)',
    mkp: 'MKP (00-52-34)',
    '00 52 34': 'MKP (00-52-34)',
    dap: 'DAP (18-46-0)',
    '18 46 0': 'DAP (18-46-0)',
    'phosphoric acid': 'Phosphoric Acid',
    'potassium phosphite': 'Potassium Phosphite',
    'phosphonic acid': 'Phosphonic Acid',
    'magnesium sulphate': 'Magnesium Sulphate',
    'magnesium sulfate': 'Magnesium Sulphate',
    mgso4: 'Magnesium Sulphate',
    epsom: 'Magnesium Sulphate',
    'ammonium sulphate': 'Ammonium Sulphate',
    'ammonium sulfate': 'Ammonium Sulphate',
    sop: 'Potassium Sulphate (SOP)',
    'potassium sulphate': 'Potassium Sulphate (SOP)',
    znso4: 'ZnSO₄ / FeSO₄ / MnSO₄',
    feso4: 'ZnSO₄ / FeSO₄ / MnSO₄',
    mnso4: 'ZnSO₄ / FeSO₄ / MnSO₄',
    'zinc sulphate': 'ZnSO₄ / FeSO₄ / MnSO₄',
    'iron sulphate': 'ZnSO₄ / FeSO₄ / MnSO₄',
    'manganese sulphate': 'ZnSO₄ / FeSO₄ / MnSO₄',
    'humic acid': 'Humic Acid Flakes',
    'humic acid flakes': 'Humic Acid Flakes',
    lime: 'Lime / Bicarbonates',
    bicarbonate: 'Lime / Bicarbonates',
    bicarbonates: 'Lime / Bicarbonates',
    'oil based pesticide': 'Oil-Based Pesticides',
    'oil based pesticides': 'Oil-Based Pesticides',
    mancozeb: 'Mancozeb',
    'copper oxychloride': 'Copper oxychloride',
};
export const CALCIUM_NITRATE_TANK_MIX_RULES = [
    { product: 'Urea', compatible: true, aliases: ['urea'] },
    {
        product: 'Potassium Nitrate',
        compatible: true,
        aliases: ['potassium nitrate', 'kno3', '13-0-45', '13 0 45'],
    },
    { product: 'Boron (Solubor)', compatible: true, aliases: ['boron', 'solubor'] },
    { product: 'Amino Acids', compatible: true, aliases: ['amino acid', 'amino acids'] },
    {
        product: 'Protein Hydrolysate',
        compatible: true,
        aliases: ['protein hydrolysate', 'hydrolysate'],
    },
    {
        product: 'Light Seaweed Extract',
        compatible: true,
        aliases: ['seaweed', 'seaweed extract', 'light seaweed'],
        notes: 'Use low dose only.',
    },
    {
        product: 'Fulvic Acid',
        compatible: true,
        aliases: ['fulvic', 'fulvic acid'],
        notes: 'Use low dose only.',
    },
    {
        product: 'Chelated Micronutrients (EDTA)',
        compatible: true,
        aliases: ['edta', 'chelated', 'micronutrient edta'],
    },
    {
        product: 'MAP (12-61-0)',
        compatible: false,
        aliases: ['map', '12-61-0', 'mono ammonium phosphate'],
        notes: 'Phosphate sources precipitate with calcium.',
    },
    {
        product: 'MKP (00-52-34)',
        compatible: false,
        aliases: ['mkp', '00-52-34', 'mono potassium phosphate'],
        notes: 'Never combine with Ca nitrate + MgSO₄ — precipitation & clogging.',
    },
    {
        product: 'DAP (18-46-0)',
        compatible: false,
        aliases: ['dap', '18-46-0', 'di ammonium phosphate'],
    },
    {
        product: 'Phosphoric Acid',
        compatible: false,
        aliases: ['phosphoric acid', 'phosphoric'],
    },
    {
        product: 'Potassium Phosphite',
        compatible: false,
        aliases: ['potassium phosphite', 'phosphite'],
    },
    {
        product: 'Phosphonic Acid',
        compatible: false,
        aliases: ['phosphonic acid', 'phosphonic', 'fosetyl'],
        notes: 'Never combine with Ca nitrate + MgSO₄ — precipitation & clogging.',
    },
    {
        product: 'Magnesium Sulphate',
        compatible: false,
        aliases: ['magnesium sulphate', 'magnesium sulfate', 'mgso4', 'epsom', 'epsom salt'],
        notes: 'Sulphates precipitate with calcium in the same tank. Apply separately.',
    },
    {
        product: 'Ammonium Sulphate',
        compatible: false,
        aliases: ['ammonium sulphate', 'ammonium sulfate', 'amsul'],
    },
    {
        product: 'Potassium Sulphate (SOP)',
        compatible: false,
        aliases: ['sop', 'potassium sulphate', 'potassium sulfate'],
    },
    {
        product: 'ZnSO₄ / FeSO₄ / MnSO₄',
        compatible: false,
        aliases: ['znso4', 'feso4', 'mnso4', 'zinc sulphate', 'iron sulphate', 'manganese sulphate'],
    },
    {
        product: 'Humic Acid Flakes',
        compatible: false,
        aliases: ['humic', 'humic acid', 'humic flakes'],
    },
    {
        product: 'Lime / Bicarbonates',
        compatible: false,
        aliases: ['lime', 'bicarbonate', 'bicarbonates', 'agricultural lime'],
    },
    {
        product: 'Oil-Based Pesticides',
        compatible: false,
        aliases: ['oil based', 'oil pesticide', 'horticultural oil', 'neem oil concentrate'],
    },
];
export const CALCIUM_NITRATE_MIX_WARNING = 'Never mix Calcium Nitrate + Magnesium Sulphate + MKP or Phosphonic Acid in one tank — causes precipitation and clogging.';
export function normalizeTankMixToken(raw) {
    const key = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    if (!key)
        return raw.trim();
    if (PRODUCT_ALIASES[key])
        return PRODUCT_ALIASES[key];
    for (const [alias, canonical] of Object.entries(PRODUCT_ALIASES)) {
        if (key.includes(alias) || alias.includes(key))
            return canonical;
    }
    return raw.trim().replace(/\s+/g, ' ');
}
export function isCalciumNitrateProduct(name) {
    const n = normalizeTankMixToken(name);
    return n === CALCIUM_NITRATE_PRODUCT || /calcium\s*nitrate/i.test(name);
}
/** Lookup when one side of the pair is Calcium Nitrate (built-in chart). */
export function lookupCalciumNitratePair(productA, productB) {
    const a = normalizeTankMixToken(productA);
    const b = normalizeTankMixToken(productB);
    let anchor = a;
    let other = b;
    if (isCalciumNitrateProduct(b) && !isCalciumNitrateProduct(a)) {
        anchor = CALCIUM_NITRATE_PRODUCT;
        other = normalizeTankMixToken(a);
    }
    else if (isCalciumNitrateProduct(a)) {
        anchor = CALCIUM_NITRATE_PRODUCT;
        other = normalizeTankMixToken(b);
    }
    else {
        return null;
    }
    const otherKey = other.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    for (const rule of CALCIUM_NITRATE_TANK_MIX_RULES) {
        const labels = [rule.product, ...rule.aliases];
        for (const label of labels) {
            const lk = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            if (otherKey === lk || otherKey.includes(lk) || lk.includes(otherKey)) {
                let notes = rule.notes;
                if (!rule.compatible &&
                    (rule.product === 'Magnesium Sulphate' ||
                        rule.product.includes('MKP') ||
                        rule.product.includes('Phosphonic'))) {
                    notes = [notes, CALCIUM_NITRATE_MIX_WARNING].filter(Boolean).join(' ');
                }
                return {
                    found: true,
                    productA: anchor,
                    productB: rule.product,
                    compatible: rule.compatible,
                    notes,
                };
            }
        }
    }
    return null;
}
/** Rows for spray_compatibility_rules seed migration */
export function calciumNitrateRulesForDb() {
    return CALCIUM_NITRATE_TANK_MIX_RULES.map((r) => ({
        product_a: CALCIUM_NITRATE_PRODUCT,
        product_b: r.product,
        compatible: r.compatible,
        notes: r.notes ?? null,
    }));
}
//# sourceMappingURL=calcium-nitrate-tank-mix.knowledge.js.map