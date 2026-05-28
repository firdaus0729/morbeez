import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovedRecommendationMessage } from '../src/services/core/recommendation-communication.service.js';

describe('buildApprovedRecommendationMessage', () => {
  it('renders English fallback copy', () => {
    const msg = buildApprovedRecommendationMessage({
      id: '1',
      farmer_id: 'f1',
      issue_detected: 'Leaf yellowing',
      recommendation_text: 'Apply balanced NPK',
      dosage: '5g/L',
      application_type: 'Foliar',
      weather_warning: null,
      language: 'en',
      status: 'approved',
    });
    assert.match(msg, /Approved recommendation/i);
    assert.match(msg, /Advice/i);
  });

  it('renders Hindi localized labels', () => {
    const msg = buildApprovedRecommendationMessage({
      id: '2',
      farmer_id: 'f1',
      issue_detected: 'पीला पड़ना',
      recommendation_text: 'NPK का संतुलित उपयोग करें',
      dosage: null,
      application_type: null,
      weather_warning: null,
      language: 'hi',
      status: 'approved',
    });
    assert.match(msg, /स्वीकृत सलाह/);
    assert.match(msg, /सलाह/);
  });
});
