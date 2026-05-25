/**
 * Morbeez Agriculture Product Master Catalog Generator
 * Run: node scripts/generate-product-catalog.mjs
 * Output: config/morbeez-product-master-catalog.csv
 *
 * Rules: trademark-safe internal names, no competitor trade names,
 * unique 60–120 word SEO descriptions, Shopify-import ready.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../config/morbeez-product-master-catalog.csv');

const COLUMNS = [
  'Product Trade Name',
  'Technical Name',
  'Main Category',
  'Sub Category',
  'Product Type',
  '500g/ml Rate (INR)',
  '1kg/L Rate (INR)',
  '5kg/L Rate (INR)',
  '10kg/L Rate (INR)',
  '25kg/L Rate (INR)',
  'SEO Optimized Detailed Description',
  'Benefits',
  'Suitable Crops',
  'Application Method',
  'Dosage Per 200L Water',
  'Keywords/Tags',
  'Shopify Handle',
  'Recommendation Tags',
];

function esc(val) {
  const s = String(val ?? '').replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

function priceTier(base, type) {
  const m = { liquid: 1, powder: 0.88, granular: 0.92, suspension: 1.06, combo: 1.18 };
  const b = base * (m[type] ?? 1);
  return {
    p500: Math.round(b * 0.58),
    p1: Math.round(b),
    p5: Math.round(b * 4.15),
    p10: Math.round(b * 7.75),
    p25: Math.round(b * 17.2),
  };
}

function handle(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function benefits(...items) {
  return items.slice(0, 8).join(', ');
}

const CROPS_ALL =
  'ginger, banana, pepper, cardamom, vegetables, paddy, fruits, plantation crops, spices, horticulture crops, coconut, turmeric, chilli, tomato';

/** Unique SEO description builder (60–120 words) */
let descSeq = 0;
function seoDesc({ trade, technical, main, role, crops, extra = '' }) {
  descSeq += 1;
  const hooks = [
    `${trade} is a professionally formulated ${technical} agriculture input designed for Indian ${crops} production systems.`,
    `This ${main.toLowerCase()} supports ${role} while helping improve root growth, enhance flowering, and increase yield under seasonal stress.`,
    `Suitable for drip and foliar application, it improves nutrient uptake, supports crop vigor, and integrates with biofertilizer programs when tank-mix compatibility is confirmed.`,
    `Farmers use ${trade} in fertigation and spray schedules to improve soil health, strengthen plant resilience, and achieve more uniform harvest quality.`,
    `Compatible with responsible IPM and balanced nutrition plans; perform a jar test before mixing with strong chemical inputs.`,
    extra,
    `Ideal for Morbeez advisory-led programs across Kerala and South India high-value spice and plantation blocks.`,
  ].filter(Boolean);
  const pick = (arr, i) => arr[i % arr.length];
  const stress = pick(
    ['drought', 'heat', 'salinity', 'waterlogging recovery', 'monsoon stress'],
    descSeq
  );
  const text = [
    hooks[0],
    hooks[1].replace('seasonal stress', stress),
    pick(hooks.slice(2), descSeq + 1),
    pick(hooks.slice(3), descSeq + 2),
    hooks[5] || pick(hooks.slice(4), descSeq + 3),
  ].join(' ');
  const words = text.split(/\s+/).length;
  if (words < 58) {
    return (
      text +
      ` Regular use during vegetative and reproductive stages helps maintain canopy health, reduce physiological disorders, and improve marketable output for export-oriented plots.`
    );
  }
  return text.split(/\s+/).slice(0, 120).join(' ');
}

/** @type {Array<Record<string, string>>} */
const catalog = [];

function add(row) {
  const p = priceTier(row.basePrice, row.productType);
  const desc =
    row.desc ||
    seoDesc({
      trade: row.trade,
      technical: row.technical,
      main: row.main,
      role: row.role || 'balanced crop nutrition and protection',
      crops: row.cropsShort || 'field, vegetable, and plantation',
      extra: row.descExtra,
    });
  catalog.push({
    'Product Trade Name': row.trade,
    'Technical Name': row.technical,
    'Main Category': row.main,
    'Sub Category': row.sub,
    'Product Type': row.productType,
    '500g/ml Rate (INR)': p.p500,
    '1kg/L Rate (INR)': p.p1,
    '5kg/L Rate (INR)': p.p5,
    '10kg/L Rate (INR)': p.p10,
    '25kg/L Rate (INR)': p.p25,
    'SEO Optimized Detailed Description': desc,
    Benefits: row.benefits,
    'Suitable Crops': row.crops || CROPS_ALL,
    'Application Method': row.method,
    'Dosage Per 200L Water': row.dosage,
    'Keywords/Tags': row.keywords,
    'Shopify Handle': handle(row.trade),
    'Recommendation Tags': row.recTags,
  });
}

// ═══════════════════════════════════════════════════════════
// MORBEEZ LABEL LINE (client product images — own trademarks)
// ═══════════════════════════════════════════════════════════
const morbeezLabel = [
  {
    trade: 'M TRIAC',
    technical: 'Triacontanol 0.1% EC',
    main: 'Plant Growth Regulators',
    sub: 'Triacontanol',
    productType: 'liquid',
    basePrice: 549,
    desc: `M TRIAC is a natural plant growth promoter with Triacontanol 0.1% EC that enhances photosynthesis, nutrient use efficiency, and stress tolerance in ginger, vegetables, spices, and plantation crops. It promotes cell elongation, tillering, rooting, and improves flowering, fruit set, and grain filling. Suitable for drip and foliar application with low dose–high performance economics. Compatible with biofertilizers and organic inputs; avoid strong chemical mixes without a jar test. Morbeez M TRIAC supports crop vigor, improves nutrient uptake, and helps increase yield and quality across all growing conditions.`,
    benefits: benefits(
      'promotes natural plant growth',
      'enhances photosynthesis',
      'improves nutrient use efficiency',
      'increases tillering and rooting',
      'improves flowering and fruit set',
      'enhances abiotic stress tolerance',
      'low dose high performance',
      'organic farming compatible'
    ),
    method: 'foliar spray, drip irrigation, soil application',
    dosage: '200–400 ml per 200 L water (foliar at 1–2 ml/L); drip 1–2 L/acre',
    keywords:
      'M TRIAC, Triacontanol 0.1% EC, plant growth regulator, PGR, bio stimulant, photosynthesis enhancer, yield booster, Morbeez, foliar spray, drip irrigation',
    recTags: 'm_triac, triacontanol, pgr, morbeez_core',
  },
  {
    trade: 'M NEMA',
    technical: 'Paecilomyces lilacinus 1.0×10⁸ CFU/ml',
    main: 'Bio Pesticides',
    sub: 'Biological Nematicide',
    productType: 'liquid',
    basePrice: 649,
    desc: `M NEMA is an advanced biological nematicide with Paecilomyces lilacinus that suppresses root-knot and lesion nematodes by parasitizing eggs and reducing soil populations. It protects the root zone, improves root health and nutrient uptake, and enhances plant vigor and yield without harmful residues. Suitable for soil application, drip irrigation, and foliar spray in ginger, banana, pepper, cardamom, vegetables, and plantation crops. Eco-friendly and compatible with biofertilizers; avoid mixing with strong chemical fertilizers and pesticides. Morbeez M NEMA improves soil health in the rhizosphere and supports sustainable nematode management programs.`,
    benefits: benefits(
      'suppresses root-knot nematodes',
      'parasitizes nematode eggs',
      'protects root zone',
      'improves root health',
      'enhances nutrient uptake',
      'eco-friendly residue-free',
      'compatible with organic farming',
      'long-lasting rhizosphere protection'
    ),
    method: 'soil application, drip irrigation, foliar spray, drenching',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M NEMA, Paecilomyces lilacinus, biological nematicide, nematode control, root health, bio pesticide, Morbeez, organic farming',
    recTags: 'm_nema, paecilomyces, nematicide, morbeez_core',
  },
  {
    trade: 'M SEA',
    technical: 'Seaweed Extract (Ascophyllum nodosum) 20% w/v',
    main: 'Organic Inputs',
    sub: 'Seaweed Extract',
    productType: 'liquid',
    basePrice: 599,
    desc: `M SEA is a premium seaweed extract liquid with Ascophyllum nodosum (20% w/v), organic carbon, mannitol, and alginate that improves plant vigor, stress resilience, and yield quality. It stimulates root growth for better absorption, improves flower initiation and fruit development, and enhances nutrient uptake efficiency. Suitable for drought, heat, and salinity stress management in paddy, fruits, vegetables, and spices. Use via soil application, drip, or foliar spray; compatible with bio inputs. Morbeez M SEA is 100% natural, residue-free, and ideal for drip and foliar programs seeking faster crop response and higher productivity.`,
    benefits: benefits(
      'improves plant vigor',
      'enhances stress tolerance',
      'stimulates root growth',
      'improves flowering and fruit set',
      'increases yield and shelf life',
      'natural marine bioactives',
      'quick absorption',
      'eco-friendly residue-free'
    ),
    method: 'foliar spray, drip irrigation, soil application, fertigation',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M SEA, seaweed extract, Ascophyllum nodosum, bio stimulant, stress reliever, organic input, Morbeez, foliar spray',
    recTags: 'm_sea, seaweed, organic_input, morbeez_core',
  },
  {
    trade: 'M ORTHO',
    technical: 'Orthosilicic Acid 0.5% w/w',
    main: 'Specialty Products',
    sub: 'Ortho Silicic Acid',
    productType: 'liquid',
    basePrice: 579,
    desc: `M ORTHO delivers stabilized orthosilicic acid (0.5% w/w) to strengthen cell walls, improve plant structure, and enhance tolerance to abiotic stress in all commercial crops. It promotes healthier, greener growth and improves yield, size, and crop quality through better silicon nutrition. Suitable for foliar spray and drip irrigation; compatible with most fertilizers and pesticides after jar testing. Morbeez M ORTHO supports crop vigor, improves nutrient uptake, and is ideal for plantation, vegetable, and fruit programs requiring lodging and stress resilience.`,
    benefits: benefits(
      'strengthens cell walls',
      'improves plant structure',
      'enhances stress tolerance',
      'promotes vigorous growth',
      'improves yield and quality',
      'stabilized orthosilicic acid',
      'drip and foliar suitable',
      'Make in India quality input'
    ),
    method: 'foliar spray, drip irrigation, fertigation',
    dosage: '200–300 ml per 200 L water (foliar at 1.0–1.5 ml/L); drip 1–2 L/acre',
    keywords:
      'M ORTHO, orthosilicic acid, silicon fertilizer, stress tolerance, cell wall strength, specialty agriculture, Morbeez',
    recTags: 'm_ortho, silicon, specialty, morbeez_core',
  },
  {
    trade: 'M NPK+',
    technical: 'NPK Microbial Consortia',
    main: 'Bio Fertilizers',
    sub: 'NPK Consortia',
    productType: 'powder',
    basePrice: 449,
    desc: `M NPK+ is a multi-strain microbial consortium that mobilizes nitrogen, phosphorus, and potassium in soil, improving fertilizer use efficiency and soil fertility. It enhances nutrient availability, promotes healthy root activity, balances soil microbiology, and supports sustainable productivity in intensive farming. Apply via soil application or drip; compatible with organic inputs. Avoid strong chemical bactericides. Morbeez M NPK+ helps improve soil health, supports crop vigor, and increases yield in ginger, banana, pepper, vegetables, and plantation systems.`,
    benefits: benefits(
      'mobilizes N P K nutrients',
      'improves fertilizer efficiency',
      'promotes root activity',
      'enhances soil microbial balance',
      'reduces nutrient losses',
      'supports sustainable yields',
      'suitable for continuous cropping',
      'compatible with organic programs'
    ),
    method: 'soil application, drip irrigation, fertigation, seed treatment',
    dosage: '2–4 kg/acre soil; 1–2 kg/acre drip (powder product)',
    keywords:
      'M NPK+, NPK microbial consortia, bio fertilizer, nutrient mobilization, soil health, Morbeez, fertigation',
    recTags: 'm_npk_plus, npk_consortia, bio_fertilizer, morbeez_core',
  },
  {
    trade: 'M VAM',
    technical: 'Vesicular Arbuscular Mycorrhiza 1.0×10⁸ CFU/ml',
    main: 'Bio Fertilizers',
    sub: 'VAM',
    productType: 'liquid',
    basePrice: 569,
    desc: `M VAM contains beneficial VAM fungi that form symbiotic associations with roots, expanding root surface area and improving uptake of P, K, Zn, Fe, and micronutrients. It enhances plant vigor, drought and salinity tolerance, soil structure, and yield quality in ginger, spices, fruits, and plantation crops. Apply through soil, drip, or foliar routes; compatible with biofertilizers. Morbeez M VAM improves root growth, supports soil health, and is a trusted mycorrhizal biofertilizer for organic and integrated programs.`,
    benefits: benefits(
      'expands root surface area',
      'improves P K Zn Fe uptake',
      'enhances plant vigor',
      'drought and salinity tolerance',
      'improves soil structure',
      'symbiotic root partner',
      'increases yield quality',
      '100% natural eco-friendly'
    ),
    method: 'soil application, drip irrigation, foliar spray, nursery application',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M VAM, vesicular arbuscular mycorrhiza, bio fertilizer, root growth, nutrient uptake, Morbeez, VAM liquid',
    recTags: 'm_vam, vam, mycorrhiza, morbeez_core',
  },
  {
    trade: 'M CALSOL',
    technical: 'Calcium Mobilizing Liquid (Ca 8% + EDTA-Ca 2%)',
    main: 'Micronutrients',
    sub: 'Calcium',
    productType: 'liquid',
    basePrice: 539,
    desc: `M CALSOL is a calcium mobilizing liquid that improves calcium uptake and translocation, strengthens cell walls, and prevents disorders such as blossom end rot in fruits and vegetables. It improves fruit firmness, size, shelf life, and root development while supporting stress tolerance. Suitable for drip and foliar application in tomato, chilli, banana, citrus, and plantation crops. Morbeez M CALSOL enhances flowering, increases yield, and integrates with balanced nutrition and bio programs when compatibility is verified.`,
    benefits: benefits(
      'prevents calcium deficiency',
      'strengthens cell walls',
      'improves fruit firmness',
      'enhances root growth',
      'reduces physiological disorders',
      'fast-acting soluble calcium',
      'stress tolerance support',
      'drip and foliar suitable'
    ),
    method: 'foliar spray, drip irrigation, soil application, fertigation',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M CALSOL, calcium fertilizer, blossom end rot, fruit quality, calcium mobilizing, micronutrient, Morbeez',
    recTags: 'm_calsol, calcium, micronutrient, morbeez_core',
  },
  {
    trade: 'M Z-ZOL',
    technical: 'Zinc Mobilizing Liquid (Zn 12% w/v)',
    main: 'Micronutrients',
    sub: 'Zinc',
    productType: 'liquid',
    basePrice: 529,
    desc: `M Z-ZOL corrects zinc deficiency, prevents chlorosis, and improves enzyme activity, photosynthesis, and leaf greenness in paddy, maize, citrus, chilli, and horticulture crops. It supports healthy root and shoot development, yield quality, and stress recovery with quick absorption. Use as foliar spray, drip, or soil application; compatible with biofertilizers. Morbeez M Z-ZOL improves nutrient uptake, enhances flowering, and helps increase yield in zinc-deficient Indian soils.`,
    benefits: benefits(
      'corrects zinc deficiency',
      'prevents chlorosis',
      'enhances photosynthesis',
      'improves enzyme activity',
      'supports root shoot growth',
      'quick absorption formula',
      'stress performance',
      'all crops and soils'
    ),
    method: 'foliar spray, drip irrigation, soil application',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M Z-ZOL, zinc mobilizing, zinc fertilizer, chlorosis correction, micronutrient, Morbeez, foliar zinc',
    recTags: 'm_z_zol, zinc, micronutrient, morbeez_core',
  },
  {
    trade: 'M SUBTIL',
    technical: 'Bacillus subtilis 1.0×10⁹ CFU/ml',
    main: 'Bio Pesticides',
    sub: 'Biological Fungicide',
    productType: 'liquid',
    basePrice: 619,
    desc: `M SUBTIL is a broad-spectrum biological fungicide based on Bacillus subtilis that controls fungal diseases naturally, induces systemic resistance, and promotes healthy crop growth. It improves root development, nutrient uptake, soil microbial balance, and yield quality while remaining safe for beneficial organisms. Suitable for foliar spray, drip, and soil application in vegetables, spices, fruits, and plantation crops. Morbeez M SUBTIL supports IPM programs, controls fungal diseases biologically, and improves soil health without harmful residues.`,
    benefits: benefits(
      'controls fungal diseases naturally',
      'induces systemic resistance',
      'promotes healthy growth',
      'improves root development',
      'enhances soil microbial balance',
      'long shelf-life spore former',
      'safe for environment',
      'effective under field stress'
    ),
    method: 'foliar spray, drip irrigation, soil application, drenching',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M SUBTIL, Bacillus subtilis, biological fungicide, fungal disease control, bio pesticide, Morbeez, IPM',
    recTags: 'm_subtil, bacillus_subtilis, bio_fungicide, morbeez_core',
  },
  {
    trade: 'M K-MOB',
    technical: 'Potassium Mobilizing Liquid (K₂O 12% w/v)',
    main: 'Bio Fertilizers',
    sub: 'KMB',
    productType: 'liquid',
    basePrice: 549,
    desc: `M K-MOB mobilizes bound potassium in soil, improving K uptake, fruit size, weight, shelf life, and flowering in banana, chilli, tomato, grapes, and plantation crops. It strengthens plants against drought and heat stress and improves water use efficiency with better root systems. Suitable for drip and foliar application; compatible with bio inputs. Morbeez M K-MOB improves nutrient uptake, enhances flowering, and helps increase yield in potassium-limited field conditions.`,
    benefits: benefits(
      'mobilizes soil potassium',
      'improves fruit size and weight',
      'enhances shelf life',
      'supports flowering fruiting',
      'drought heat stress tolerance',
      'better water use efficiency',
      'stronger root system',
      'all crops and soils'
    ),
    method: 'foliar spray, drip irrigation, soil application, fertigation',
    dosage: '400–600 ml per 200 L water (foliar at 2–3 ml/L); drip 1–2 L/acre',
    keywords:
      'M K-MOB, potassium mobilizing, KMB, bio fertilizer, fruit quality, yield booster, Morbeez',
    recTags: 'm_k_mob, kmb, potassium, morbeez_core',
  },
  {
    trade: 'M PSEUDO',
    technical: 'Pseudomonas fluorescens 2×10⁸ CFU/g',
    main: 'Bio Pesticides',
    sub: 'Pseudomonas',
    productType: 'powder',
    basePrice: 479,
    desc: `M PSEUDO contains beneficial Pseudomonas fluorescens for root zone protection, pathogen suppression, and vigorous crop establishment. It colonizes roots aggressively, improves nutrient mobilization, enhances stress tolerance, and supports drip irrigation systems. Apply via soil, drip, or seed treatment in ginger, vegetables, spices, and plantation crops. Morbeez M PSEUDO improves soil health, protects roots from harmful pathogens, and is ideal for integrated disease management without harsh chemical residues.`,
    benefits: benefits(
      'protects root zone',
      'suppresses harmful pathogens',
      'aggressive rhizosphere colonization',
      'improves nutrient mobilization',
      'enhances stress tolerance',
      'drip system compatible',
      'rapid root recovery support',
      'organic program friendly'
    ),
    method: 'soil application, drip irrigation, seed treatment, drenching',
    dosage: '2–4 kg/acre soil; seed treat 5–10 g/kg; foliar 2–3 g/L where applicable',
    keywords:
      'M PSEUDO, Pseudomonas fluorescens, root defence, bio pesticide, soil health, Morbeez, seed treatment',
    recTags: 'm_pseudo, pseudomonas, bio_pesticide, morbeez_core',
  },
  {
    trade: 'M TRICHO',
    technical: 'Trichoderma harzianum 2×10⁶ CFU/g',
    main: 'Bio Pesticides',
    sub: 'Trichoderma harzianum',
    productType: 'powder',
    basePrice: 469,
    desc: `M TRICHO is an advanced Trichoderma harzianum bio fungicide that protects roots from soil-borne pathogens, enhances root mass, and improves soil microbial activity for vigorous crop establishment. High spore viability ensures fast rhizosphere colonization and long shelf stability. Use in soil, drip, or seed/rhizome treatment programs for ginger, banana, pepper, and vegetables. Morbeez M TRICHO controls fungal diseases in the root zone, improves nutrient uptake, and supports intensive farming systems.`,
    benefits: benefits(
      'protects roots from soil pathogens',
      'enhances root mass',
      'improves soil microbial balance',
      'fast rhizosphere colonization',
      'high spore viability',
      'intensive farming suitable',
      'compatible with biofertilizers',
      'yield and quality support'
    ),
    method: 'soil application, drip irrigation, seed treatment, rhizome treatment',
    dosage: '2–4 kg/acre soil; seed/rhizome 5–10 g/kg',
    keywords:
      'M TRICHO, Trichoderma harzianum, bio fungicide, root shield, soil borne disease, Morbeez, seed treatment',
    recTags: 'm_tricho, trichoderma, bio_fungicide, morbeez_core',
  },
];

for (const p of morbeezLabel) {
  add({ ...p, role: p.sub });
}

// ═══════════════════════════════════════════════════════════
// BIO FERTILIZERS (expanded)
// ═══════════════════════════════════════════════════════════
const bioFertLines = [
  ['RhizoMax Azospirillum', 'Azospirillum brasilense', 'Azospirillum', 'liquid', 498],
  ['NitroFix Azotobacter', 'Azotobacter chroococcum', 'Azotobacter', 'liquid', 488],
  ['LegumeRhizo Plus', 'Rhizobium leguminosarum', 'Rhizobium', 'liquid', 468],
  ['PhosphoSolv PSB', 'Bacillus megaterium (PSB)', 'PSB', 'liquid', 478],
  ['PhosphoSolv PSB Granules', 'Bacillus megaterium (PSB)', 'PSB', 'granular', 428],
  ['K-Mobilizer Elite', 'Frateuria aurantia (KMB)', 'KMB', 'liquid', 508],
  ['ZincSolv ZSB', 'Bacillus aryabhattai (ZSB)', 'ZSB', 'liquid', 498],
  ['SilicaSolv Consortium', 'Silicate solubilizing bacteria', 'Silica Solubilizers', 'liquid', 518],
  ['SulphurOxid Pro', 'Thiobacillus ferrooxidans', 'Sulphur Oxidizers', 'liquid', 508],
  ['ConsortiaNPK Liquid', 'NPK microbial consortia', 'NPK Consortia', 'liquid', 528],
  ['ConsortiaNPK Granules', 'NPK microbial consortia', 'NPK Consortia', 'granular', 458],
  ['LiquidBioBoost', 'Mixed PGPR liquid', 'Liquid Bio Fertilizers', 'liquid', 538],
  ['VAM Granule Gold', 'Glomus intraradices', 'VAM', 'granular', 548],
  ['VAM Liquid Pro', 'VAM spores liquid', 'VAM', 'liquid', 558],
  ['MycoRhizo Power', 'VAM + Trichoderma blend', 'VAM', 'powder', 588],
  ['PSB-KMB Duo', 'PSB + KMB combination', 'NPK Consortia', 'liquid', 568],
  ['ZnFe Mobilizer', 'Zn + Fe solubilizers', 'ZSB', 'liquid', 528],
  ['NurseryRhizo Start', 'PGPR nursery concentrate', 'Liquid Bio Fertilizers', 'liquid', 488],
  ['DripBio Activator', 'Liquid bio for fertigation', 'Liquid Bio Fertilizers', 'liquid', 518],
  ['SoilRevive Consortium', 'Multi-strain soil inoculant', 'NPK Consortia', 'powder', 498],
  ['PaddyRhizo Special', 'Azospirillum for cereals', 'Azospirillum', 'liquid', 478],
  ['FruitRhizo KMB', 'KMB for fruit crops', 'KMB', 'liquid', 518],
  ['SpiceRoot Booster', 'VAM + PSB for spices', 'VAM', 'liquid', 568],
  ['PlantationVAM Max', 'Premium VAM plantation dose', 'VAM', 'liquid', 598],
  ['CarbonBio Humate Plus', 'Humate + PGPR', 'Liquid Bio Fertilizers', 'liquid', 548],
];
for (const [trade, tech, sub, type, base] of bioFertLines) {
  add({
    trade,
    technical: tech,
    main: 'Bio Fertilizers',
    sub,
    productType: type,
    basePrice: base,
    role: `${sub.toLowerCase()} action for nutrient mobilization and root health`,
    benefits: benefits(
      'improves root growth',
      'enhances nutrient uptake',
      'improves soil health',
      'supports microbial balance',
      'increases yield potential',
      'drip and soil compatible'
    ),
    method: 'soil application, drip irrigation, fertigation, nursery application, seed treatment',
    dosage:
      type === 'liquid'
        ? '400–600 ml per 200 L water (2–3 ml/L foliar); drip 1–2 L/acre'
        : '2–4 kg/acre soil; seed 5–10 g/kg',
    keywords: `bio fertilizer, ${sub}, ${tech}, Morbeez, soil health, yield booster, organic agriculture`,
    recTags: `bio_fertilizer, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// BIO PESTICIDES (expanded)
// ═══════════════════════════════════════════════════════════
const bioPestLines = [
  ['TrichoGuard Viride', 'Trichoderma viride 1.5%', 'Trichoderma viride', 'powder', 458],
  ['TrichoHarz Shield', 'Trichoderma harzianum 2%', 'Trichoderma harzianum', 'powder', 468],
  ['PseudoFluoro Root', 'Pseudomonas fluorescens 2%', 'Pseudomonas', 'liquid', 498],
  ['Beauveria Bass Pro', 'Beauveria bassiana 1.15% WP', 'Beauveria', 'powder', 548],
  ['MetaShield Anisopliae', 'Metarhizium anisopliae 1% WP', 'Metarhizium', 'powder', 558],
  ['VertiGuard Bio', 'Verticillium lecanii', 'Verticillium', 'powder', 528],
  ['NemaGuard Paecilo', 'Paecilomyces lilacinus', 'Paecilomyces', 'liquid', 598],
  ['BT Caterpillar Guard', 'Bacillus thuringiensis kurstaki', 'Bacillus thuringiensis', 'powder', 518],
  ['NeemAzad 3000', 'Azadirachtin 0.15% EC', 'Neem formulations', 'liquid', 628],
  ['NeemAzad 10000', 'Azadirachtin 1% EC', 'Neem formulations', 'liquid', 748],
  ['HerbalGuard EC', 'Plant extract botanical EC', 'Botanical pesticides', 'liquid', 598],
  ['LecaniWhitefly', 'Lecanicillium spp.', 'Verticillium', 'liquid', 618],
  ['NemaStop Granules', 'Paecilomyces lilacinus WP', 'Paecilomyces', 'powder', 578],
  ['TrichoBT Combo', 'Trichoderma + BT blend', 'Trichoderma harzianum', 'powder', 598],
  ['RhizoDefense Pseudo', 'Pseudomonas for blight', 'Pseudomonas', 'liquid', 508],
  ['SoilFungus Tricho', 'Trichoderma soil dose', 'Trichoderma viride', 'granular', 488],
  ['FoliarBT Plus', 'BT foliar concentrate', 'Bacillus thuringiensis', 'liquid', 538],
  ['BotanicalMite EC', 'Plant oil mite control', 'Botanical pesticides', 'liquid', 588],
  ['BioIPM Starter', 'Multi bio pest kit base', 'Botanical pesticides', 'liquid', 648],
];
for (const [trade, tech, sub, type, base] of bioPestLines) {
  add({
    trade,
    technical: tech,
    main: 'Bio Pesticides',
    sub,
    productType: type,
    basePrice: base,
    role: `biological control via ${sub}`,
    benefits: benefits(
      'biological pest and disease control',
      'IPM compatible',
      'reduces chemical residue risk',
      'improves crop safety',
      'supports soil health',
      'eco-friendly option'
    ),
    method: 'foliar spray, soil application, drenching, seed treatment',
    dosage:
      type === 'liquid'
        ? '400–800 ml per 200 L water (2–4 ml/L)'
        : '2–4 kg/acre soil; 2–3 g/L foliar',
    keywords: `bio pesticide, ${sub}, ${tech}, organic pest control, Morbeez, IPM`,
    recTags: `bio_pesticide, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// ORGANIC INPUTS (expanded)
// ═══════════════════════════════════════════════════════════
const organicLines = [
  ['HumicGold 85', 'Potassium humate 85%', 'Humic Acid', 'granular', 448],
  ['HumicFlow 24', 'Humic acid 24% liquid', 'Humic Acid', 'liquid', 528],
  ['FulvicBoost 12', 'Fulvic acid 12%', 'Fulvic Acid', 'liquid', 548],
  ['SeaGrow Ascophyllum', 'Ascophyllum nodosum 20%', 'Seaweed Extract', 'liquid', 578],
  ['AminoCrop 20', 'Amino acid 20%', 'Amino Acid', 'liquid', 598],
  ['ProteinHydro 15', 'Protein hydrolysate 15%', 'Protein Hydrolysate', 'liquid', 618],
  ['FishAmino Plus', 'Fish amino acid liquid', 'Fish Amino Acid', 'liquid', 638],
  ['OrganicCarbon 18', 'Organic carbon liquid', 'Organic Carbon', 'liquid', 508],
  ['Panchagavya Pro', 'Fermented organic blend', 'Panchagavya', 'liquid', 568],
  ['VermiGold Compost', 'Processed vermicompost', 'Vermicompost', 'granular', 298],
  ['FarmCompost Premium', 'Decomposed FYM compost', 'Compost', 'granular', 268],
  ['BioStim SeaHumic', 'Seaweed + humic combo', 'Bio stimulants', 'liquid', 628],
  ['StressRelief Organic', 'Organic stress reliever', 'Bio stimulants', 'liquid', 588],
  ['RootStim Organic', 'Root biostimulant organic', 'Bio stimulants', 'liquid', 598],
  ['BloomOrganic Boost', 'Flowering organic stimulant', 'Bio stimulants', 'liquid', 608],
];
for (const [trade, tech, sub, type, base] of organicLines) {
  add({
    trade,
    technical: tech,
    main: 'Organic Inputs',
    sub,
    productType: type,
    basePrice: base,
    role: `${sub} for soil fertility and crop metabolism`,
    benefits: benefits(
      'improves soil health',
      'enhances nutrient absorption',
      'supports crop vigor',
      'organic farming suitable',
      'stress recovery support',
      'residue conscious programs'
    ),
    method: 'soil application, drip irrigation, foliar spray, fertigation',
    dosage:
      type === 'liquid'
        ? '400–800 ml per 200 L water; drip 2–3 L/acre'
        : '500–1000 kg/acre (compost); 100–250 kg/acre (granules)',
    keywords: `organic fertilizer, ${sub}, ${tech}, soil health, bio stimulant, Morbeez`,
    recTags: `organic_input, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// WATER SOLUBLE FERTILIZERS
// ═══════════════════════════════════════════════════════════
const wsfLines = [
  ['HydroNPK 19-19-19', 'NPK 19-19-19', 'Balanced NPK', '19-19-19', 648],
  ['HydroNPK 13-40-13', 'NPK 13-40-13', 'High P-K', '13-40-13', 698],
  ['HydroNPK 00-52-34', 'NPK 00-52-34', 'High P-K', '00-52-34', 718],
  ['HydroNPK 12-61-00', 'NPK 12-61-00', 'High P', '12-61-00', 688],
  ['HydroNPK 00-00-50', 'NPK 00-00-50', 'High K', '00-00-50', 678],
  ['HydroNPK 13-0-45', 'NPK 13-0-45', 'High K', '13-0-45', 708],
  ['CalciumNitrate WS', 'Calcium nitrate 15.5-0-0', 'Calcium Nitrate', '15.5-0-0', 668],
  ['PotassiumNitrate WS', 'Potassium nitrate 13-0-45', 'Potassium Nitrate', '13-0-45', 728],
  ['MagnesiumSulphate WS', 'Magnesium sulphate 9.6% Mg', 'Magnesium Sulphate', 'Mg 9.6%', 618],
  ['MAP WS Grade', 'Mono ammonium phosphate', 'MAP', '12-61-0', 698],
  ['MKP WS Grade', 'Mono potassium phosphate 0-52-34', 'MKP', '0-52-34', 758],
  ['SOP WS Grade', 'Potassium sulphate 0-0-50', 'SOP', '0-0-50', 688],
  ['BloomNPK 10-52-10', 'NPK flowering grade', 'Balanced NPK', '10-52-10', 708],
  ['FruitNPK 5-15-45', 'NPK fruiting grade', 'High K', '5-15-45', 718],
  ['GreenNPK 10-54-10', 'NPK young crop', 'High P', '10-54-10', 688],
  ['DripNPK 24-24-18', 'NPK drip grade', 'Balanced NPK', '24-24-18', 708],
  ['MicroTE WS Pack', 'NPK + trace elements', 'Balanced NPK', '20-20-20+TE', 738],
];
for (const [trade, tech, sub, npk, base] of wsfLines) {
  add({
    trade,
    technical: tech,
    main: 'Water Soluble Fertilizers',
    sub,
    productType: 'powder',
    basePrice: base,
    role: `precision ${npk} nutrition for fertigation and foliar feeding`,
    benefits: benefits(
      'fully water soluble',
      'rapid nutrient availability',
      'drip and foliar suitable',
      'improves fruit quality',
      'enhances uniform growth',
      'greenhouse compatible'
    ),
    method: 'drip irrigation, fertigation, foliar spray',
    dosage: '500 g–1.5 kg per 200 L foliar; 1–3 kg/acre fertigation',
    keywords: `water soluble fertilizer, NPK ${npk}, fertigation, drip fertilizer, foliar NPK, Morbeez`,
    recTags: `wsf, npk_${npk.replace(/-/g, '_')}`,
  });
}

// ═══════════════════════════════════════════════════════════
// MICRONUTRIENTS
// ═══════════════════════════════════════════════════════════
const microLines = [
  ['Zn EDTA 12', 'Zinc EDTA 12%', 'Zn EDTA', 598],
  ['Fe EDTA 12', 'Iron EDTA 12%', 'Fe EDTA', 628],
  ['Mn EDTA 12', 'Manganese EDTA 12%', 'Mn EDTA', 608],
  ['Cu EDTA 12', 'Copper EDTA 12%', 'Cu EDTA', 618],
  ['Boron Ethanolamine', 'Boron 11% ethanolamine', 'Boron', 588],
  ['Calcium EDTA 9', 'Calcium EDTA 9%', 'Calcium', 638],
  ['Magnesium EDTA 6', 'Magnesium EDTA 6%', 'Magnesium', 618],
  ['MultiChelate TE', 'Multi micronutrient EDTA', 'Chelated Mixes', 698],
  ['ZnMn Chelate Duo', 'Zinc + Manganese chelate', 'Chelated Mixes', 668],
  ['CaB Fruit Quality', 'Calcium + Boron blend', 'Chelated Mixes', 688],
  ['FeEDDHA 6', 'Iron EDDHA 6%', 'Fe EDTA', 698],
  ['BoroZinc Flow', 'Boron + Zinc liquid', 'Chelated Mixes', 648],
];
for (const [trade, tech, sub, base] of microLines) {
  add({
    trade,
    technical: tech,
    main: 'Micronutrients',
    sub,
    productType: 'liquid',
    basePrice: base,
    role: `corrects ${sub} deficiency and supports reproductive growth`,
    benefits: benefits(
      'corrects micronutrient deficiency',
      'improves chlorophyll and photosynthesis',
      'enhances flowering and fruit set',
      'chelated for stable uptake',
      'foliar and drip suitable',
      'stress recovery support'
    ),
    method: 'foliar spray, drip fertigation, soil drenching',
    dosage: '200–500 ml per 200 L water (0.5–1 g/L chelated powders if solid)',
    keywords: `micronutrient, ${sub}, chelated fertilizer, foliar nutrient, Morbeez`,
    recTags: `micronutrient, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// CHEMICAL FUNGICIDES
// ═══════════════════════════════════════════════════════════
const fungicideLines = [
  ['CopperOxy 50 WP', 'Copper oxychloride 50% WP', 'Copper Oxychloride', 498],
  ['Mancozeb 75 WP', 'Mancozeb 75% WP', 'Mancozeb', 478],
  ['Carbendazim 50 WP', 'Carbendazim 50% WP', 'Carbendazim', 528],
  ['Hexaconazole 5 EC', 'Hexaconazole 5% EC', 'Hexaconazole', 698],
  ['Propiconazole 25 EC', 'Propiconazole 25% EC', 'Propiconazole', 728],
  ['Azoxystrobin 23 SC', 'Azoxystrobin 23% SC', 'Azoxystrobin', 868],
  ['Dimethomorph 50 WP', 'Dimethomorph 50% WP', 'Dimethomorph', 738],
  ['Fosetyl Al 80 WP', 'Fosetyl aluminium 80% WP', 'Fosetyl Aluminium', 758],
  ['Sulphur 80 WP', 'Sulphur 80% WP', 'Sulphur', 428],
  ['Combo Manco Metalaxyl', 'Mancozeb + Metalaxyl', 'Combination fungicides', 798],
  ['Tebuconazole 25 EC', 'Tebuconazole 25% EC', 'Tebuconazole', 718],
  ['Tricyclazole 75 WP', 'Tricyclazole 75% WP', 'Tricyclazole', 748],
  ['Validamycin 3 L', 'Validamycin 3% L', 'Validamycin', 798],
  ['Kresoxim 44 WG', 'Kresoxim-methyl 44% WG', 'Kresoxim', 858],
  ['CopperHydroxide 77', 'Copper hydroxide 77% WP', 'Copper Oxychloride', 548],
];
for (const [trade, tech, sub, base] of fungicideLines) {
  const type = /EC|SC|L/.test(tech) ? 'liquid' : 'powder';
  add({
    trade,
    technical: tech,
    main: 'Chemical Fungicides',
    sub,
    productType: type,
    basePrice: base,
    role: `preventive and curative fungal disease control`,
    benefits: benefits(
      'controls fungal diseases',
      'protects new foliage',
      'reduces inoculum pressure',
      'improves yield quality',
      'supports healthy canopy',
      'rotate MOA within season'
    ),
    method: 'foliar spray, seed treatment (where labeled)',
    dosage: type === 'liquid' ? '200–400 ml per 200 L water (1–2 ml/L)' : '400–500 g per 200 L water',
    keywords: `fungicide, ${sub}, fungal disease control, crop protection, Morbeez`,
    recTags: `fungicide, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// CHEMICAL INSECTICIDES
// ═══════════════════════════════════════════════════════════
const insectLines = [
  ['Imidacloprid 30.5 SC', 'Imidacloprid 30.5% SC', 'Imidacloprid', 798],
  ['Thiamethoxam 25 WG', 'Thiamethoxam 25% WG', 'Thiamethoxam', 818],
  ['Fipronil 0.3 GR', 'Fipronil 0.3% GR', 'Fipronil', 698],
  ['Chlorpyrifos 20 EC', 'Chlorpyrifos 20% EC', 'Chlorpyrifos', 748],
  ['Emamectin 5 SG', 'Emamectin benzoate 5% SG', 'Emamectin', 858],
  ['Spinosad 45 SC', 'Spinosad 45% SC', 'Spinosad', 878],
  ['Abamectin 1.9 EC', 'Abamectin 1.9% EC', 'Abamectin', 838],
  ['Diafenthiuron 50 WP', 'Diafenthiuron 50% WP', 'Diafenthiuron', 788],
  ['Lambda Cyhalothrin 5 EC', 'Lambda cyhalothrin 5% EC', 'Lambda Cyhalothrin', 758],
  ['Bifenthrin 10 EC', 'Bifenthrin 10% EC', 'Bifenthrin', 768],
  ['Acetamiprid 20 SP', 'Acetamiprid 20% SP', 'Acetamiprid', 738],
  ['Indoxacarb 14.5 SC', 'Indoxacarb 14.5% SC', 'Indoxacarb', 848],
  ['Flubendiamide 39 SC', 'Flubendiamide 39% SC', 'Flubendiamide', 888],
  ['Chlorantraniliprole 18.5 SC', 'Chlorantraniliprole 18.5% SC', 'Chlorantraniliprole', 918],
];
for (const [trade, tech, sub, base] of insectLines) {
  const type = /EC|SC/.test(tech) ? 'liquid' : /GR/.test(tech) ? 'granular' : 'powder';
  add({
    trade,
    technical: tech,
    main: 'Chemical Insecticides',
    sub,
    productType: type,
    basePrice: base,
    role: `targeted insect control for commercial crop protection`,
    benefits: benefits(
      'effective against target pests',
      'rapid knockdown potential',
      'supports yield security',
      'IPM when thresholds met',
      'residual activity options',
      'scalable field programs'
    ),
    method: type === 'granular' ? 'soil application' : 'foliar spray',
    dosage:
      type === 'granular'
        ? '4–8 kg/acre'
        : '200–400 ml per 200 L water (0.5–2 ml/L per label)',
    keywords: `insecticide, ${sub}, pest control, sucking pest, agriculture crop protection, Morbeez`,
    recTags: `insecticide, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// HERBICIDES
// ═══════════════════════════════════════════════════════════
const herbLines = [
  ['Glyphosate 41 SL', 'Glyphosate 41% SL', 'Glyphosate', 598],
  ['Paraquat 24 SL', 'Paraquat 24% SL', 'Paraquat', 558],
  ['Pendimethalin 30 EC', 'Pendimethalin 30% EC', 'Pendimethalin', 698],
  ['Atrazine 50 WP', 'Atrazine 50% WP', 'Atrazine', 628],
  ['2-4D Amine 58 SL', '2,4-D amine salt 58% SL', '2,4-D', 618],
  ['Oxyfluorfen 23.5 EC', 'Oxyfluorfen 23.5% EC', 'Oxyfluorfen', 748],
  ['Quizalofop 5 EC', 'Quizalofop ethyl 5% EC', 'Quizalofop', 728],
  ['Metsulfuron 20 WP', 'Metsulfuron methyl 20% WP', 'Metsulfuron', 668],
  ['Glufosinate 13.5 SL', 'Glufosinate ammonium 13.5% SL', 'Glufosinate', 688],
  ['PreEmergent Combo', 'Pendimethalin + auxiliary', 'Pre-emergent herbicides', 758],
  ['PostEmergent Broad', '2,4-D + MCPA blend', 'Post-emergent herbicides', 698],
];
for (const [trade, tech, sub, base] of herbLines) {
  add({
    trade,
    technical: tech,
    main: 'Herbicides',
    sub,
    productType: 'liquid',
    basePrice: base,
    role: `weed management for cleaner crop stands`,
    benefits: benefits(
      'controls target weeds',
      'reduces weed competition',
      'saves hand-weeding cost',
      'improves crop establishment',
      'timely field cleanliness',
      'plantation row suitable'
    ),
    method: 'foliar spray directed, pre-emergence soil spray where labeled',
    dosage: '2–4 ml/L spot spray; 1.5–3 L/acre field rate (product specific)',
    keywords: `herbicide, ${sub}, weed control, plantation weed management, Morbeez`,
    recTags: `herbicide, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// PLANT GROWTH REGULATORS
// ═══════════════════════════════════════════════════════════
const pgrLines = [
  ['Gibberellic GA3', 'Gibberellic acid 0.001% L', 'GA3', 798],
  ['NAA 4.5 SL', 'Naphthalene acetic acid 4.5% SL', 'NAA', 688],
  ['CPPU 0.1 SP', 'Forchlorfenuron 0.1% SP', 'CPPU', 828],
  ['Ethephon 39 SL', 'Ethephon 39% SL', 'Ethephon', 728],
  ['Paclobutrazol 23 SC', 'Paclobutrazol 23% SC', 'Paclobutrazol', 798],
  ['Brassinolide 0.01 SP', 'Brassinolide 0.01% SP', 'Brassinolide', 858],
  ['Triacontanol 0.05 ME', 'Triacontanol 0.05% ME', 'Triacontanol', 738],
  ['CCC 50 SL', 'Chlormequat chloride 50% SL', 'Anti-lodging', 668],
  ['Salicylic 0.2 SP', 'Salicylic acid 0.2% SP', 'SAR inducer', 698],
];
for (const [trade, tech, sub, base] of pgrLines) {
  const type = /SL|ME|L/.test(tech) ? 'liquid' : 'powder';
  add({
    trade,
    technical: tech,
    main: 'Plant Growth Regulators',
    sub,
    productType: type,
    basePrice: base,
    role: `growth regulation for uniformity and quality`,
    benefits: benefits(
      'regulates vegetative growth',
      'improves fruit set',
      'enhances uniformity',
      'supports flowering programs',
      'horticulture grade response',
      'stage-specific application'
    ),
    method: 'foliar spray',
    dosage: '40–200 ml per 200 L water (strict growth stage timing)',
    keywords: `plant growth regulator, ${sub}, PGR, horticulture, Morbeez`,
    recTags: `pgr, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// SPECIALTY PRODUCTS
// ═══════════════════════════════════════════════════════════
const specialtyLines = [
  ['Nano Zinc Suspension', 'Nano zinc oxide suspension', 'Nano Zinc', 748],
  ['Nano Nitrogen Liquid', 'Nano urea dispersion', 'Nano Nitrogen', 768],
  ['Nano Copper Flow', 'Nano copper formulation', 'Nano Copper', 758],
  ['Potassium Silicate Pro', 'Potassium silicate', 'Potassium Silicate', 628],
  ['StressGuard Amino', 'Stress management amino blend', 'Stress management products', 648],
  ['CarbonTech Humic', 'Carbon technology humate', 'Carbon technology products', 598],
  ['SpreadMax Surfactant', 'Non-ionic surfactant', 'Adjuvant', 458],
  ['pH Buffer Spray Aid', 'Spray water buffer', 'Water Conditioner', 488],
  ['DriftReduce Polymer', 'Anti-drift polymer', 'Drift Reducer', 518],
  ['SiliconForte Specialty', 'Silicon specialty blend', 'Silicon', 638],
];
for (const [trade, tech, sub, base] of specialtyLines) {
  add({
    trade,
    technical: tech,
    main: 'Specialty Products',
    sub,
    productType: 'liquid',
    basePrice: base,
    role: `${sub} for advanced crop management`,
    benefits: benefits(
      'improves application efficiency',
      'supports stress management',
      'enhances nutrient performance',
      'modern formulation technology',
      'tank-mix flexible',
      'high-value crop suitable'
    ),
    method: 'foliar spray, drip fertigation, tank-mix',
    dosage: '100–400 ml per 200 L water; 1–2 L/acre drip',
    keywords: `specialty agriculture, ${sub}, nano fertilizer, stress management, Morbeez`,
    recTags: `specialty, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// ═══════════════════════════════════════════════════════════
// CROP SPECIAL PRODUCTS
// ═══════════════════════════════════════════════════════════
const cropSpecialLines = [
  ['GingerRhizo Nutrition', 'Zn-B-Cu ginger nutrition', 'Ginger Special', 'ginger', 698],
  ['GingerDisease Shield', 'Ginger disease management program', 'Ginger Special', 'ginger', 828],
  ['GingerBorer Control', 'Ginger shoot borer program', 'Ginger Special', 'ginger', 858],
  ['BananaSigatoka Program', 'Banana leaf disease program', 'Banana Special', 'banana', 868],
  ['BananaNutrition Pack', 'Banana K-Ca-B program', 'Banana Special', 'banana', 798],
  ['PepperFootRot Guard', 'Pepper Phytophthora program', 'Pepper Special', 'pepper', 838],
  ['CardamomCapsule Set', 'Cardamom flowering nutrition', 'Cardamom Special', 'cardamom', 768],
  ['VegetableIPM Pack', 'Vegetable pest nutrition bundle', 'Vegetable Special', 'vegetables', 798],
  ['PlantationVigor Max', 'Plantation micronutrient program', 'Plantation Crop Special', 'plantation', 818],
  ['FloweringCrop Boost', 'Flowering stage specialty', 'Flowering Crop Special', 'fruits', 788],
  ['PaddyBlast Program', 'Paddy blast management', 'Paddy Special', 'paddy', 748],
  ['TurmericRhizome Care', 'Turmeric nutrition program', 'Spice Special', 'turmeric', 718],
  ['ChilliThrips Program', 'Chilli thrips IPM', 'Vegetable Special', 'chilli', 808],
  ['TomatoQuality Set', 'Tomato Ca-B quality', 'Vegetable Special', 'tomato', 698],
  ['GrapesDowny Program', 'Grape downy mildew', 'Fruit Special', 'grapes', 878],
];
for (const [trade, tech, sub, crop, base] of cropSpecialLines) {
  add({
    trade,
    technical: tech,
    main: 'Crop Special Products',
    sub,
    productType: 'liquid',
    basePrice: base,
    role: `crop-specific program for ${crop}`,
    crops: `${crop}, related spices, vegetables, and plantation crops in same agro-climate`,
    benefits: benefits(
      'crop-targeted nutrition and protection',
      'improves marketable yield',
      'local pest-disease alignment',
      'advisory program ready',
      'dealer bundle friendly',
      'stage-wise guidance'
    ),
    method: 'foliar spray, drip irrigation, drenching, fertigation',
    dosage: '400–600 ml per 200 L water; 2–3 L/acre drip',
    keywords: `${crop} agriculture, ${sub}, crop program, Morbeez ${crop}, yield booster`,
    recTags: `crop_${crop}, crop_special`,
  });
}

// Pack-size variants for Morbeez core (5L / 10L commercial)
for (const core of morbeezLabel.filter((p) => p.productType === 'liquid')) {
  for (const [suffix, mult, pack] of [
    [' 5L Pack', 4.8, '5 L'],
    [' 10L Pack', 9.2, '10 L'],
  ]) {
    add({
      trade: core.trade + suffix,
      technical: core.technical,
      main: core.main,
      sub: core.sub + ' Bulk',
      productType: 'liquid',
      basePrice: Math.round(core.basePrice * mult),
      desc:
        (core.desc || '') +
        ` Available in economical ${pack} packs for dealer networks and plantation programs with proportional dilution guidance.`,
      benefits: core.benefits,
      method: core.method,
      dosage: core.dosage,
      keywords: core.keywords + `, bulk pack, ${pack}`,
      recTags: core.recTags + ', bulk_pack',
    });
  }
}

// ─── BULK EXPANSION: crop-line & formulation variants ─────
const cropExpand = [
  ...['Cucumber', 'Brinjal', 'Okra', 'Watermelon', 'Pumpkin', 'Beans'].map((c) => [
    `${c} NutriProgram`,
    `WSF + micro ${c} blend`,
    `${c} Program`,
    c.toLowerCase(),
    680,
  ]),
  ...['Mango', 'Pomegranate', 'Papaya', 'Guava', 'Citrus'].map((c) => [
    `${c} FruitSet`,
    `Ca-B-Zn ${c} quality`,
    `${c} Fruit`,
    c.toLowerCase(),
    720,
  ]),
  ...['Arecanut', 'Betel', 'Nutmeg', 'Clove', 'Coffee', 'Tea'].map((c) => [
    `${c} PlantationCare`,
    `Plantation TE + humic`,
    `${c} Plantation`,
    c.toLowerCase(),
    710,
  ]),
  ...['Onion', 'Garlic', 'Potato', 'Carrot'].map((c) => [
    `${c} BulbRoot`,
    `Sulphur + micro ${c}`,
    `${c} Root Crop`,
    c.toLowerCase(),
    690,
  ]),
];
for (const [trade, tech, sub, crop, base] of cropExpand) {
  add({
    trade,
    technical: tech,
    main: 'Crop Special Products',
    sub,
    productType: 'liquid',
    basePrice: base,
    role: `dedicated ${crop} nutrition and protection program`,
    crops: `${crop}, vegetables, fruits, plantation crops, spices`,
    benefits: benefits('crop-tuned performance', 'seasonal stress support', 'yield quality focus', 'drip foliar ready'),
    method: 'foliar spray, drip fertigation',
    dosage: '400–600 ml per 200 L water; 2 L/acre drip',
    keywords: `${crop} fertilizer, ${crop} crop program, Morbeez agriculture`,
    recTags: `crop_${crop}, crop_special`,
  });
}

const extraFungicides = [
  ['Prochloraz 25 EC', 'Prochloraz 25% EC', 'Prochloraz', 768],
  ['Iprovalicarb 8.5 SC', 'Iprovalicarb 8.5% SC', 'Iprovalicarb', 888],
  ['Bordeaux Paste Mix', 'Copper sulphate + lime', 'Bordeaux', 398],
  ['Streptomycin Bacterial', 'Streptomycin sulphate', 'Antibiotic', 668],
  ['Captan 50 WP', 'Captan 50% WP', 'Captan', 528],
  ['Difenoconazole 25 EC', 'Difenoconazole 25% EC', 'Difenoconazole', 828],
];
for (const [trade, tech, sub, base] of extraFungicides) {
  const type = /EC|SC/.test(tech) ? 'liquid' : 'powder';
  add({
    trade,
    technical: tech,
    main: 'Chemical Fungicides',
    sub,
    productType: type,
    basePrice: base,
    role: 'specialized fungal and bacterial disease control',
    benefits: benefits('controls crop diseases', 'foliar protection', 'yield security'),
    method: 'foliar spray',
    dosage: type === 'liquid' ? '200–400 ml per 200 L water' : '400–500 g per 200 L water',
    keywords: `fungicide, ${sub}, disease control, Morbeez`,
    recTags: `fungicide, ${sub.toLowerCase()}`,
  });
}

const extraInsects = [
  ['Pymetrozine 50 WG', 'Pymetrozine 50% WG', 'Pymetrozine', 798],
  ['Spiromesifen 22.9 SC', 'Spiromesifen 22.9% SC', 'Spiromesifen', 858],
  ['Buprofezin 25 SC', 'Buprofezin 25% SC', 'Buprofezin', 768],
  ['Cartap 50 SP', 'Cartap hydrochloride 50% SP', 'Cartap', 728],
  ['Profenophos 50 EC', 'Profenophos 50% EC', 'Profenophos', 778],
  ['Cyantraniliprole 10 OD', 'Cyantraniliprole 10.26% OD', 'Cyantraniliprole', 928],
];
for (const [trade, tech, sub, base] of extraInsects) {
  const type = /EC|SC|OD/.test(tech) ? 'liquid' : 'powder';
  add({
    trade,
    technical: tech,
    main: 'Chemical Insecticides',
    sub,
    productType: type,
    basePrice: base,
    role: 'commercial insect pest management',
    benefits: benefits('target pest control', 'yield protection', 'IPM compatible timing'),
    method: 'foliar spray',
    dosage: '200–400 ml per 200 L water',
    keywords: `insecticide, ${sub}, pest management`,
    recTags: `insecticide, ${sub.toLowerCase()}`,
  });
}

const extraBioFert = [
  ['ActinoLife Granules', 'Streptomyces consortium', 'Actinomycetes', 'granular', 498],
  ['LactoSoil Liquid', 'Lactic acid bacteria', 'LAB', 'liquid', 478],
  ['YeastExtract Crop', 'Saccharomyces cerevisiae extract', 'Yeast', 'liquid', 528],
  ['BioChar Humate', 'Biochar + humates', 'Carbon Soil', 'granular', 538],
  ['MycoPlus Granules', 'VAM + biochar', 'VAM', 'granular', 568],
  ['ZnFe PSB Combo', 'Zn solubilizer + PSB', 'PSB', 'liquid', 548],
  ['RhizoTea Drench', 'LAB + humic drench', 'Liquid Bio Fertilizers', 'liquid', 558],
  ['PaddyAzospirillum', 'Azospirillum for rice', 'Azospirillum', 'liquid', 468],
  ['MaizeAzospirillum', 'Azospirillum for maize', 'Azospirillum', 'liquid', 478],
  ['PulseRhizobium', 'Rhizobium for pulses', 'Rhizobium', 'powder', 458],
];
for (const [trade, tech, sub, type, base] of extraBioFert) {
  add({
    trade,
    technical: tech,
    main: 'Bio Fertilizers',
    sub,
    productType: type,
    basePrice: base,
    role: 'advanced soil biological enrichment',
    benefits: benefits('soil biology boost', 'root growth', 'nutrient cycling'),
    method: 'soil application, drip, nursery',
    dosage: type === 'liquid' ? '400–600 ml per 200 L water' : '3–5 kg/acre',
    keywords: `bio fertilizer, ${sub}, soil health`,
    recTags: `bio_fertilizer, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

const extraOrganics = [
  ['CastorDeoil Cake', 'Castor de-oiled cake', 'Oil Cake', 'granular', 298],
  ['NeemCake 6N', 'Neem seed cake', 'Oil Cake', 'powder', 318],
  ['BoneMeal Natural', 'Steamed bone meal', 'Phosphorus Organic', 'powder', 398],
  ['RockPhosphate Powder', 'Rock phosphate', 'Mineral P', 'powder', 348],
  ['WoodAsh Potash', 'Wood ash enriched K', 'Potash Organic', 'powder', 288],
  ['CoirPith Compost', 'Coir pith composted', 'Compost', 'granular', 278],
  ['OrganicNPK 7-7-7', 'Organic NPK blend', 'Organic NPK', 'granular', 428],
  ['KelpPowder Organic', 'Dried kelp powder', 'Seaweed Extract', 'powder', 458],
];
for (const [trade, tech, sub, type, base] of extraOrganics) {
  add({
    trade,
    technical: tech,
    main: 'Organic Inputs',
    sub,
    productType: type,
    basePrice: base,
    role: 'organic soil fertility building',
    benefits: benefits('organic nutrition', 'soil structure', 'microbial food'),
    method: 'soil application, basal dressing',
    dosage: type === 'liquid' ? '2–3 L/acre' : '100–500 kg/acre',
    keywords: `organic input, ${sub}, organic farming`,
    recTags: `organic_input, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// WSF pack variants
for (const [trade, tech, sub, npk, base] of wsfLines) {
  add({
    trade: trade + ' 25kg Bag',
    technical: tech,
    main: 'Water Soluble Fertilizers',
    sub: sub + ' Bulk',
    productType: 'powder',
    basePrice: Math.round(base * 22),
    role: `bulk ${npk} fertigation supply`,
    benefits: benefits('bulk economy', 'drip tank ready', 'consistent dissolution', 'dealer stocking'),
    method: 'fertigation, drip irrigation',
    dosage: '10–25 kg/acre per application (crop stage dependent)',
    keywords: `bulk NPK, ${npk}, fertigation bag, Morbeez`,
    recTags: `wsf_bulk, npk_${npk.replace(/-/g, '_')}`,
  });
}

// Additional formulation & AI-class variants
const formulationExpand = [
  ...['WP', 'SC', 'EC', 'WG', 'SL', 'OD'].map((form, i) => [
    `BioFungus Tricho ${form}`,
    `Trichoderma harzianum ${form} grade`,
    'Trichoderma harzianum',
    form === 'WP' || form === 'WG' ? 'powder' : 'liquid',
    440 + i * 12,
  ]),
  ...['Liquid', 'Granular', 'Powder'].map((form, i) => [
    `Azospirillum Crop ${form}`,
    'Azospirillum brasilense',
    'Azospirillum',
    form.toLowerCase(),
    460 + i * 20,
  ]),
  ...['Early', 'Mid', 'Late'].map((stage, i) => [
    `GingerStage ${stage} Feed`,
    `Stage ${stage} ginger nutrition`,
    'Ginger Special',
    'liquid',
    700 + i * 30,
  ]),
  ...['Pre', 'Post'].map((t, i) => [
    `WeedClear ${t} Emergent`,
    `${t}-emergence herbicide program`,
    t === 'Pre' ? 'Pre-emergent herbicides' : 'Post-emergent herbicides',
    'liquid',
    620 + i * 40,
  ]),
];
for (const [trade, tech, sub, type, base] of formulationExpand) {
  const main = sub.includes('Ginger')
    ? 'Crop Special Products'
    : sub.includes('herbicide') || sub.includes('emergent')
      ? 'Herbicides'
      : sub.includes('Trichoderma')
        ? 'Bio Pesticides'
        : 'Bio Fertilizers';
  add({
    trade,
    technical: tech,
    main,
    sub: typeof sub === 'string' && sub.length < 30 ? sub : 'Formulation Variant',
    productType: type,
    basePrice: base,
    role: `specialized ${sub} field program`,
    benefits: benefits('professional grade', 'field proven', 'dealer ready', 'clear dosage'),
    method: 'foliar spray, soil application, drip irrigation',
    dosage: '400–600 ml per 200 L water or 2–4 kg/acre soil',
    keywords: `${trade}, ${tech}, agriculture input, Morbeez`,
    recTags: `variant, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// Micronutrient powder SKUs
for (const [trade, tech, sub, base] of microLines) {
  add({
    trade: trade + ' Powder',
    technical: tech.replace('liquid', 'powder grade'),
    main: 'Micronutrients',
    sub: sub + ' Powder',
    productType: 'powder',
    basePrice: Math.round(base * 0.92),
    role: `powder grade ${sub} for foliar`,
    benefits: benefits('powder foliar grade', 'tank mix stable', 'deficiency correction'),
    method: 'foliar spray',
    dosage: '400–800 g per 200 L water',
    keywords: `micronutrient powder, ${sub}, foliar`,
    recTags: `micronutrient_powder, ${sub.replace(/\s/g, '_').toLowerCase()}`,
  });
}

// Insecticide + fungicide tank-mix pairs (named programs, not competitor brands)
const programPairs = [
  ['ChilliIPM Foliar Set', 'Acetamiprid + mancozeb program', 'Chilli', 1180],
  ['TomatoBlight Aphid Set', 'Lambda + mancozeb program', 'Tomato', 1150],
  ['GingerRot Borer Set', 'Fungicide + emamectin program', 'Ginger', 1280],
  ['GrapeMildew Mite Set', 'Sulphur + abamectin program', 'Grapes', 1220],
  ['PaddyBlast Hopper Set', 'Tricyclazole + buprofezin program', 'Paddy', 1190],
  ['BananaSigatoka Aphid Set', 'Azoxystrobin + imidacloprid program', 'Banana', 1350],
];
for (const [trade, tech, crop, base] of programPairs) {
  add({
    trade,
    technical: tech,
    main: 'Crop Special Products',
    sub: `${crop} IPM Program`,
    productType: 'combo',
    basePrice: base,
    role: `integrated pest disease program for ${crop}`,
    crops: `${crop}, vegetables, fruits, spices`,
    benefits: benefits('IPM program bundle', 'seasonal window aligned', 'dealer margin', 'advisory tagged'),
    method: 'foliar spray with staged timing',
    dosage: 'Per component label; typical 200–400 ml total AI per 200 L',
    keywords: `${crop} IPM, crop protection program, Morbeez`,
    recTags: `ipm_program, crop_${crop}`,
  });
}

// Half-litre starter packs for liquids (dealer sampler)
for (const core of morbeezLabel.filter((p) => p.productType === 'liquid')) {
  add({
    trade: core.trade + ' 500ml',
    technical: core.technical,
    main: core.main,
    sub: core.sub + ' Starter',
    productType: 'liquid',
    basePrice: Math.round(core.basePrice * 0.62),
    desc: core.desc,
    benefits: core.benefits,
    method: core.method,
    dosage: core.dosage,
    keywords: core.keywords + ', 500ml, starter pack',
    recTags: core.recTags + ', starter_500ml',
  });
}

// Combo kits
const combos = [
  ['Morbeez Root Health Kit', 'M VAM + M PSEUDO + M TRICHO', 'Root Health Combo', 1690],
  ['Morbeez Ginger Program Kit', 'M TRIAC + M SUBTIL + M Z-ZOL', 'Ginger Combo', 1890],
  ['Morbeez Stress Recovery Kit', 'M SEA + M ORTHO + Humic', 'Stress Combo', 1750],
  ['Morbeez Nematode Defense Kit', 'M NEMA + M VAM + Neem bio', 'Nematode Combo', 1980],
  ['Morbeez Drip Nutrition Kit', 'M NPK+ + M K-MOB + WSF', 'Fertigation Combo', 2050],
  ['Morbeez Fruit Quality Kit', 'M CALSOL + M SEA + M K-MOB', 'Fruit Combo', 1920],
];
for (const [trade, tech, sub, base] of combos) {
  add({
    trade,
    technical: tech,
    main: 'Crop Special Products',
    sub,
    productType: 'combo',
    basePrice: base,
    role: `integrated ${sub} for simplified farmer programs`,
    benefits: benefits(
      'simplified multi-product program',
      'cost efficient bundle',
      'aligned growth stages',
      'dealer margin friendly',
      'WhatsApp SKU ready',
      'AI recommendation tagged'
    ),
    method: 'foliar spray, drip irrigation, soil application per kit guide',
    dosage: 'Refer kit insert; typical 2–3 L/acre equivalent combined',
    keywords: `Morbeez combo, ${sub}, agriculture bundle, kit offer`,
    recTags: `combo_kit, morbeez_bundle`,
  });
}

// Dedupe by handle
const seen = new Set();
const unique = catalog.filter((row) => {
  const h = row['Shopify Handle'];
  if (seen.has(h)) return false;
  seen.add(h);
  return true;
});

const lines = [COLUMNS.join(',')];
for (const row of unique) {
  lines.push(COLUMNS.map((c) => esc(row[c])).join(','));
}

writeFileSync(OUT, lines.join('\n'), 'utf8');

const morbeezCount = unique.filter((r) => r['Product Trade Name'].startsWith('M ')).length;
const byCat = {};
for (const r of unique) {
  byCat[r['Main Category']] = (byCat[r['Main Category']] || 0) + 1;
}
console.log(`Generated ${unique.length} products → ${OUT}`);
console.log(`Morbeez M-line SKUs: ${morbeezCount}`);
console.log('By category:', JSON.stringify(byCat, null, 2));
