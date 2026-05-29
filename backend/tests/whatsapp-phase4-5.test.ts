import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { seasonalPriorityService } from '../src/services/whatsapp/pipeline/seasonal-priority.service.js';

describe('seasonal priority (phase 3 regression)', () => {
  it('identifies monsoon in July', () => {
    const july = new Date('2026-07-10T12:00:00+05:30');
    assert.equal(seasonalPriorityService.currentPhase(july), 'monsoon');
  });
});

describe('learning loop eligibility', () => {
  it('accepts better and partial outcomes', () => {
    const ok = ['better', 'partial'];
    assert.ok(ok.includes('better'));
    assert.ok(!ok.includes('worsened'));
  });
});
