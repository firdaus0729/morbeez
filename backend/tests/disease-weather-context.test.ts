import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diseaseWeatherRulesService } from '../src/services/whatsapp/pipeline/disease-weather-rules.service.js';
import { resolveCoords } from '../src/services/whatsapp/pipeline/weather-fetch.service.js';
import { seasonalPriorityService } from '../src/services/whatsapp/pipeline/seasonal-priority.service.js';

describe('weather coords', () => {
  it('prefers pincode lat/lon over district table', () => {
    const c = resolveCoords({
      district: 'Wayanad',
      pincodeLat: 11.7,
      pincodeLon: 76.1,
      pincodeLabel: 'Sulthan Bathery',
    });
    assert.equal(c.lat, 11.7);
    assert.equal(c.lon, 76.1);
  });
});

describe('disease–weather rules', () => {
  it('boosts Pyricularia in monsoon with high humidity and symptom hints', () => {
    const priors = diseaseWeatherRulesService.evaluate({
      cropType: 'ginger',
      env: {
        seasonPhase: 'monsoon',
        heavyRainLikely: true,
        highHumidityLikely: true,
        weatherRiskScore: 72,
      },
      symptomsText: 'yellow spots on leaves diamond shape blast',
    });
    assert.ok(priors.some((p) => /pyricularia|blast/i.test(p.issueLabel)));
  });

  it('monsoon detected in July', () => {
    const july = new Date('2026-07-15T12:00:00+05:30');
    assert.equal(seasonalPriorityService.currentPhase(july), 'monsoon');
  });
});
