import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
import { shopifyProductsService } from '../shopify/shopify.products.service.js';
import { productIntelligenceService } from './product-intelligence.service.js';
function parseStringList(value) {
    if (Array.isArray(value)) {
        return value.map((v) => String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
}
function isAllCrops(crops) {
    if (!crops.length)
        return false;
    return crops.some((c) => /^all\s*crops?$/i.test(c) || c === '*');
}
function extractCrops(ai, ag) {
    let crops = parseStringList(ai.crops);
    if (!crops.length)
        crops = parseStringList(ag.recommendedCrops);
    return crops;
}
function extractPests(ai, ag) {
    const fromAi = parseStringList(ai.pests);
    if (fromAi.length)
        return fromAi;
    return [
        ...parseStringList(ai.targetPests),
        ...parseStringList(ag.targetPests),
    ].filter((v, i, a) => a.indexOf(v) === i);
}
/** Demo pests when catalog products have no intelligence yet (Pest Mapping UI). */
function demoPestsForProduct(title) {
    const t = title.toLowerCase();
    if (t.includes('chakraveer') || t.includes('chlorantraniliprole 18.5')) {
        return [
            'Stem Borer',
            'Leaf Folder',
            'Shoot Borer',
            'Gundhi Bug',
            'Rice Hispa',
            'Brown Plant Hopper',
            'White-backed Plant Hopper',
            'Yellow Stem Borer',
        ];
    }
    if (t.includes('spinosad')) {
        return [
            'Fruit Borer',
            'Spodoptera',
            'Helicoverpa',
            'Thrips',
            'Aphids',
            'Whitefly',
            'Leaf Miner',
            'Cutworm',
        ];
    }
    if (t.includes('imidacloprid')) {
        return ['Aphids', 'Jassids', 'Whitefly', 'Thrips', 'Mealybug', 'Leaf Hopper'];
    }
    if (t.includes('confidor') || t.includes('thiamethoxam')) {
        return ['Aphids', 'Whitefly', 'Jassids', 'Thrips', 'Brown Plant Hopper'];
    }
    if (t.includes('cartap') || t.includes('ferterra')) {
        return ['Stem Borer', 'Leaf Folder', 'Gundhi Bug', 'Case Worm'];
    }
    return [];
}
function extractDiseases(ai, ag) {
    const fromAi = parseStringList(ai.diseases);
    if (fromAi.length)
        return fromAi;
    return [
        ...parseStringList(ai.targetDiseases),
        ...parseStringList(ag.targetDiseases),
    ].filter((v, i, a) => a.indexOf(v) === i);
}
/** Demo diseases when catalog products have no intelligence yet (Disease Mapping UI). */
function demoDiseasesForProduct(title) {
    const t = title.toLowerCase();
    if (t.includes('copper oxychloride') || t.includes('copper')) {
        return ['Leaf Spot', 'Blight', 'Anthracnose', 'Early Blight', 'Late Blight', 'Bacterial Leaf Spot'];
    }
    if (t.includes('mancozeb')) {
        return ['Downy Mildew', 'Leaf Spot', 'Blight', 'Early Blight', 'Purple Blotch'];
    }
    if (t.includes('trichoderma')) {
        return ['Root Rot', 'Damping Off', 'Wilt', 'Collar Rot'];
    }
    if (t.includes('carbendazim') || t.includes('bavistin')) {
        return ['Powdery Mildew', 'Smut', 'Grain Discoloration', 'Leaf Spot', 'Blight'];
    }
    if (t.includes('propiconazole') || t.includes('tilt')) {
        return ['Rust', 'Leaf Spot', 'Blight', 'Karnal Bunt', 'Powdery Mildew'];
    }
    if (t.includes('hexaconazole') || t.includes('contaf')) {
        return ['Powdery Mildew', 'Rust', 'Sheath Blight', 'Leaf Spot'];
    }
    if (t.includes('streptocycline') || t.includes('bactericide')) {
        return ['Bacterial Leaf Blight', 'Leaf Spot', 'Canker', 'Bacterial Wilt'];
    }
    if (t.includes('validamycin') || t.includes('fungicide')) {
        return ['Sheath Blight', 'Blight', 'Leaf Spot', 'Root Rot'];
    }
    if (t.includes('bio') || t.includes('organic')) {
        return ['Root Rot', 'Damping Off', 'Wilt', 'Soil-borne Diseases'];
    }
    return [];
}
function hasSavedMapping(tab, ai, ag) {
    switch (tab) {
        case 'pest':
            return (parseStringList(ai.pests).length > 0 ||
                parseStringList(ai.targetPests).length > 0 ||
                parseStringList(ag.targetPests).length > 0);
        case 'disease':
            return (parseStringList(ai.diseases).length > 0 ||
                parseStringList(ai.targetDiseases).length > 0 ||
                parseStringList(ag.targetDiseases).length > 0);
        case 'symptom':
            return (parseStringList(ai.symptoms).length > 0 ||
                parseStringList(ai.symptomsControlled).length > 0 ||
                parseStringList(ag.symptomsControlled).length > 0);
        default:
            return true;
    }
}
function extractForTab(tab, ai, ag, productTitle) {
    switch (tab) {
        case 'crop':
            return extractCrops(ai, ag);
        case 'pest': {
            const pests = extractPests(ai, ag);
            if (pests.length || !productTitle)
                return pests;
            const demo = demoPestsForProduct(productTitle);
            return demo;
        }
        case 'disease': {
            const diseases = extractDiseases(ai, ag);
            if (diseases.length || !productTitle)
                return diseases;
            return demoDiseasesForProduct(productTitle);
        }
        case 'symptom':
            return [
                ...parseStringList(ai.symptoms),
                ...parseStringList(ai.symptomsControlled),
                ...parseStringList(ag.symptomsControlled),
            ].filter((v, i, a) => a.indexOf(v) === i);
        case 'usage':
            return parseStringList(ai.usageRules).length
                ? parseStringList(ai.usageRules)
                : [
                    ai.dosage,
                    ai.applicationStage,
                    ai.sprayInterval,
                    ag.dosePerAcre,
                    ag.applicationMethod,
                ]
                    .map((v) => (v ? String(v).trim() : ''))
                    .filter(Boolean);
        default:
            return [];
    }
}
function formatMappedDisplay(tab, items) {
    if (tab === 'crop' && isAllCrops(items)) {
        return { display: 'all', tags: [], count: items.length || 1, allLabel: 'All Crops' };
    }
    if (!items.length) {
        return { display: 'empty', tags: [], count: 0, allLabel: null };
    }
    return {
        display: 'tags',
        tags: items,
        count: items.length,
        allLabel: null,
    };
}
export const aiMappingAdminService = {
    async list(query) {
        const tab = query.tab ?? 'crop';
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(50, Math.max(7, query.limit ?? 7));
        const [catalog, intelResult] = await Promise.all([
            shopifyProductsService.getInventoryCatalog(query.search),
            supabase.from('product_intelligence').select('shopify_product_id, ai_mapping, agriculture'),
        ]);
        throwIfSupabaseError(intelResult.error, 'Could not load product intelligence');
        const intelMap = new Map((intelResult.data ?? []).map((r) => [
            String(r.shopify_product_id),
            {
                ai: r.ai_mapping ?? {},
                ag: r.agriculture ?? {},
            },
        ]));
        let rows = catalog.map((p) => {
            const intel = intelMap.get(p.id) ?? { ai: {}, ag: {} };
            const hasIntel = hasSavedMapping(tab, intel.ai, intel.ag);
            const mapped = extractForTab(tab, intel.ai, intel.ag, p.title);
            const formatted = formatMappedDisplay(tab, mapped);
            const usesPreview = (tab === 'pest' || tab === 'disease') && !hasIntel && mapped.length > 0;
            return {
                productId: p.id,
                productName: p.title,
                imageUrl: p.imageUrl,
                mapped,
                mappedDisplay: formatted.display,
                mappedTags: formatted.tags,
                mappedCount: formatted.count,
                allCropsLabel: formatted.allLabel,
                isPreview: usesPreview,
            };
        });
        if (query.search?.trim()) {
            const term = query.search.trim().toLowerCase();
            rows = rows.filter((r) => r.productName.toLowerCase().includes(term) ||
                r.mapped.some((m) => m.toLowerCase().includes(term)));
        }
        if (query.filter === 'mapped') {
            rows = rows.filter((r) => r.mappedCount > 0 || r.mappedDisplay === 'all');
        }
        else if (query.filter === 'unmapped') {
            rows = rows.filter((r) => r.mappedCount === 0 && r.mappedDisplay !== 'all');
        }
        const total = rows.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * limit;
        return {
            tab,
            rows: rows.slice(start, start + limit),
            pagination: { page: safePage, limit, total, pages },
        };
    },
    async updateCropMapping(shopifyProductId, crops, adminId) {
        return this.updateListMapping(shopifyProductId, 'crop', crops, adminId);
    },
    async updatePestMapping(shopifyProductId, pests, adminId) {
        return this.updateListMapping(shopifyProductId, 'pest', pests, adminId);
    },
    async updateDiseaseMapping(shopifyProductId, diseases, adminId) {
        return this.updateListMapping(shopifyProductId, 'disease', diseases, adminId);
    },
    async updateSymptomMapping(shopifyProductId, symptoms, adminId) {
        return this.updateListMapping(shopifyProductId, 'symptom', symptoms, adminId);
    },
    async updateListMapping(shopifyProductId, tab, items, adminId) {
        const product = await shopifyProductsService.get(shopifyProductId).catch(() => null);
        if (!product)
            throw new NotFoundError('Product not found');
        const existing = await productIntelligenceService.get(shopifyProductId);
        let normalized = items.map((c) => c.trim()).filter(Boolean);
        if (tab === 'crop' && normalized.some((c) => /^all\s*crops?$/i.test(c))) {
            normalized = ['All Crops'];
        }
        const joined = normalized.join(', ');
        const aiPatch = { ...existing.aiMapping };
        const agPatch = { ...existing.agriculture };
        switch (tab) {
            case 'crop':
                aiPatch.crops = normalized;
                agPatch.recommendedCrops = joined;
                break;
            case 'pest':
                aiPatch.pests = normalized;
                aiPatch.targetPests = joined;
                agPatch.targetPests = joined;
                break;
            case 'disease':
                aiPatch.diseases = normalized;
                aiPatch.targetDiseases = joined;
                agPatch.targetDiseases = joined;
                break;
            case 'symptom':
                aiPatch.symptoms = normalized;
                aiPatch.symptomsControlled = joined;
                agPatch.symptomsControlled = joined;
                break;
        }
        return productIntelligenceService.upsert(shopifyProductId, { ai_mapping: aiPatch, agriculture: agPatch }, adminId);
    },
    async listProductOptions(search) {
        const catalog = await shopifyProductsService.getInventoryCatalog(search);
        return catalog.slice(0, 100).map((p) => ({
            id: p.id,
            title: p.title,
        }));
    },
};
//# sourceMappingURL=ai-mapping-admin.service.js.map