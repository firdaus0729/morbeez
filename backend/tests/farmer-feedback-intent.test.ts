import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPriorProduct,
  extractSuggestedDiagnosis,
  isFarmerDisagreementIntent,
} from '../src/services/core/farmer-feedback-intent.service.js';

describe('farmer feedback intent', () => {
  it('detects disagreement phrases', () => {
    assert.equal(isFarmerDisagreementIntent('AI wrong'), true);
    assert.equal(isFarmerDisagreementIntent('This is not fungus'), true);
    assert.equal(isFarmerDisagreementIntent('I already had this last year'), true);
    assert.equal(isFarmerDisagreementIntent('hello menu'), false);
  });

  it('extracts suggested diagnosis and product', () => {
    assert.match(extractSuggestedDiagnosis('This is thrips') ?? '', /thrips/i);
    assert.match(extractPriorProduct('Last time spinetoram worked') ?? '', /spinetoram/i);
  });
});
