import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Stage / priority ranking used by leadService.ensureLeadForFarmer */
const STAGE_RANK: Record<string, number> = {
  new_lead: 1,
  interested: 2,
  follow_up: 3,
  recommendation: 4,
  order_placed: 5,
  repeat_customer: 6,
};

function stageRank(stage: string): number {
  return STAGE_RANK[stage] ?? 0;
}

describe('one lead per farmer policy', () => {
  it('advances stage only when new stage is further in pipeline', () => {
    assert.ok(stageRank('follow_up') > stageRank('new_lead'));
    assert.ok(stageRank('interested') > stageRank('new_lead'));
    assert.ok(stageRank('new_lead') < stageRank('order_placed'));
  });

  it('keeps higher pipeline stage when merging', () => {
    const existing = 'follow_up';
    const incoming = 'interested';
    const next =
      stageRank(incoming) >= stageRank(existing) ? incoming : existing;
    assert.equal(next, 'follow_up');
  });
});
