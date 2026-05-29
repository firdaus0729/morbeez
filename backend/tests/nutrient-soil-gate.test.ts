import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestsNutrientDeficiency } from '../src/services/whatsapp/scenarios/nutrient-soil-gate.service.js';
import type { StructuredAdvisory } from '../src/services/ai/types.js';

const base: StructuredAdvisory = {
  probableIssue: 'Possible pest',
  confidence: 0.7,
  uncertain: false,
  nutrientDeficiency: [],
  stressAnalysis: [],
  treatments: [],
  dosageGuidance: [],
  precautions: [],
  escalationRecommended: false,
  farmerSummaryEn: '',
  farmerSummaryMl: '',
  recommendedProductTags: [],
};

describe('nutrient soil gate', () => {
  it('detects nutrient mention in farmer summary', () => {
    const advisory = {
      ...base,
      farmerSummaryEn:
        'Your ginger crop likely has nutrient deficiencies, particularly nitrogen and potassium.',
    };
    assert.equal(suggestsNutrientDeficiency(advisory), true);
  });

  it('does not gate obvious pest-only issues', () => {
    const advisory = {
      ...base,
      probableIssue: 'Thrips on ginger',
      farmerSummaryEn: 'Silvery streaks suggest thrips. Spray Spinetoram 60 ml per 200 L.',
    };
    assert.equal(suggestsNutrientDeficiency(advisory), false);
  });
});
