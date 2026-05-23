import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { ProductRecommendation, StructuredAdvisory } from './types.js';

interface RuleProduct {
  handle?: string;
  title: string;
  reason: string;
  priority: number;
  dosageSchedule?: Record<string, string>;
  comboKitId?: string;
}

interface RecommendationRule {
  matchTags: string[];
  products: RuleProduct[];
}

interface CropRulesFile {
  cropType: string;
  rules: RecommendationRule[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesCache = new Map<string, CropRulesFile>();

function loadRules(cropType: string): CropRulesFile {
  const key = cropType.toLowerCase();
  if (rulesCache.has(key)) return rulesCache.get(key)!;

  const path = join(__dirname, '../../../config/recommendations', `${key}.json`);
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as CropRulesFile;
    rulesCache.set(key, parsed);
    return parsed;
  } catch {
    const fallback: CropRulesFile = {
      cropType: key,
      rules: [
        {
          matchTags: ['default'],
          products: [
            {
              title: 'Ginger Starter Advisory Kit',
              reason: 'General crop care',
              priority: 1,
            },
          ],
        },
      ],
    };
    rulesCache.set(key, fallback);
    return fallback;
  }
}

function tagsMatch(ruleTags: string[], advisoryTags: string[], issue: string): boolean {
  if (ruleTags.includes('default')) return false;
  const haystack = [...advisoryTags, issue.toLowerCase()].join(' ');
  return ruleTags.some((t) => haystack.includes(t.toLowerCase()));
}

export const recommendationService = {
  recommend(cropType: string, advisory: StructuredAdvisory): ProductRecommendation[] {
    const rules = loadRules(cropType);
    const issue = advisory.probableIssue.toLowerCase();
    const tags = advisory.recommendedProductTags.map((t) => t.toLowerCase());
    const matched: ProductRecommendation[] = [];
    const seen = new Set<string>();

    for (const rule of rules.rules) {
      if (rule.matchTags.includes('default')) continue;
      if (!tagsMatch(rule.matchTags, tags, issue)) continue;

      for (const p of rule.products) {
        const key = p.handle ?? p.title;
        if (seen.has(key)) continue;
        seen.add(key);
        matched.push({
          shopifyProductHandle: p.handle,
          productTitle: p.title,
          reason: p.reason,
          dosageSchedule: p.dosageSchedule,
          priority: p.priority,
          comboKitId: p.comboKitId,
        });
      }
    }

    if (!matched.length) {
      const defaultRule = rules.rules.find((r) => r.matchTags.includes('default'));
      for (const p of defaultRule?.products ?? []) {
        matched.push({
          shopifyProductHandle: p.handle,
          productTitle: p.title,
          reason: p.reason,
          dosageSchedule: p.dosageSchedule,
          priority: p.priority,
        });
      }
    }

    return matched.sort((a, b) => a.priority - b.priority).slice(0, 5);
  },
};
