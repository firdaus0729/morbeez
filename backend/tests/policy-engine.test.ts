import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { policyEngineService } from '../src/services/ai/policy-engine.service.js';
import type { StructuredAdvisory } from '../src/services/ai/types.js';

const baseAdvisory: StructuredAdvisory = {
  probableIssue: 'Thrips on ginger leaves',
  confidence: 0.55,
  uncertain: false,
  nutrientDeficiency: [],
  stressAnalysis: ['silvery streaking'],
  treatments: [{ action: 'Spray', productType: 'insecticide', timing: 'evening' }],
  dosageGuidance: [{ product: 'Spinetoram 11.7 SC', rate: '60 ml / 200 L', method: 'foliar', frequency: 'once' }],
  precautions: [],
  escalationRecommended: false,
  escalationReason: null,
  farmerSummaryEn: 'Likely thrips — silvery streaks on leaves. Spray Spinetoram 60 ml per 200 L water.',
  farmerSummaryMl: null,
  recommendedProductTags: [],
};

describe('policy engine — image diagnosis', () => {
  it('does not block delivery when photo was sent and issue is named', () => {
    const assessment = policyEngineService.evaluate(baseAdvisory, { hasImage: true });
    assert.equal(assessment.shouldRequestMoreEvidence, false);
    assert.equal(assessment.needsValidationQuestion, true);
  });

  it('may request more evidence for text-only low confidence without named issue', () => {
    const assessment = policyEngineService.evaluate(
      {
        ...baseAdvisory,
        probableIssue: 'uncertain',
        confidence: 0.4,
        farmerSummaryEn: '',
      },
      { hasImage: false }
    );
    assert.equal(assessment.shouldRequestMoreEvidence, true);
  });
});
