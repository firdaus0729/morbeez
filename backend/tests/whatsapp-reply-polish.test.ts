import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiagnosisLockedFacts,
} from '../src/services/whatsapp/pipeline/farmer-reply-polish.service.js';
import type { StructuredAdvisory } from '../src/services/ai/types.js';

describe('diagnosis locked facts', () => {
  it('includes issue, products, and precautions for polish guard', () => {
    const advisory: StructuredAdvisory = {
      probableIssue: 'Thrips',
      confidence: 0.82,
      uncertain: false,
      nutrientDeficiency: [],
      stressAnalysis: [],
      treatments: [],
      dosageGuidance: [
        {
          product: 'Spinetoram',
          rate: '0.3 ml/L',
          method: 'foliar spray',
          frequency: 'once',
        },
      ],
      precautions: ['Jar test before full tank'],
      escalationRecommended: false,
      escalationReason: null,
      farmerSummaryEn: 'Likely thrips on ginger leaves.',
      farmerSummaryMl: '',
      recommendedProductTags: [],
    };

    const locked = buildDiagnosisLockedFacts(advisory);
    assert.match(locked, /Thrips/i);
    assert.match(locked, /Spinetoram/i);
    assert.match(locked, /Jar test/i);
  });
});
