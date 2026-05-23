import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeConfidence, shouldEscalate } from '../src/services/ai/confidence.js';
import type { StructuredAdvisory } from '../src/services/ai/types.js';

const baseAdvisory: StructuredAdvisory = {
  probableIssue: 'Rhizome rot',
  confidence: 0.8,
  uncertain: false,
  nutrientDeficiency: [],
  stressAnalysis: [],
  treatments: [],
  dosageGuidance: [],
  precautions: [],
  escalationRecommended: false,
  farmerSummaryEn: 'Test',
  farmerSummaryMl: 'പരീക്ഷ',
  recommendedProductTags: [],
};

describe('computeConfidence', () => {
  it('merges GPT and Plant.id scores', () => {
    const score = computeConfidence(0.8, {
      diseases: [{ name: 'rot', probability: 0.9 }],
      raw: {},
    });
    assert.ok(score > 0.7 && score <= 1);
  });
});

describe('shouldEscalate', () => {
  it('escalates low confidence', () => {
    assert.equal(shouldEscalate(0.5, baseAdvisory), true);
  });

  it('escalates when AI marks uncertain', () => {
    assert.equal(shouldEscalate(0.9, { ...baseAdvisory, uncertain: true }), true);
  });

  it('does not escalate high confidence clear case', () => {
    assert.equal(shouldEscalate(0.85, baseAdvisory), false);
  });
});
