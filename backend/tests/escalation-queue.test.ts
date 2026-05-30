import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeEscalationsByFarmer } from '../src/services/ai/escalation.service.js';

describe('dedupeEscalationsByFarmer', () => {
  it('keeps first row per farmer', () => {
    const items = [
      { id: 'a', farmerId: 'f1', priority: 'high' },
      { id: 'b', farmerId: 'f2', priority: 'normal' },
      { id: 'c', farmerId: 'f1', priority: 'normal' },
    ];
    const out = dedupeEscalationsByFarmer(items);
    assert.equal(out.length, 2);
    assert.deepEqual(
      out.map((i) => i.id),
      ['a', 'b']
    );
  });

  it('returns empty list unchanged', () => {
    assert.deepEqual(dedupeEscalationsByFarmer([]), []);
  });
});
