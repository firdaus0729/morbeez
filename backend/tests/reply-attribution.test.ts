import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { replyAttributionService } from '../src/services/whatsapp/pipeline/reply-attribution.service.js';

describe('reply attribution USP line', () => {
  it('appends verified-case line with crop and district', () => {
    const line = replyAttributionService.buildAttributionLine('verified_case', 'en', {
      cropType: 'ginger',
      district: 'wayanad',
      verifiedCaseCount: 12,
    });
    assert.match(line, /12 verified field case/i);
    assert.match(line, /Not generic ChatGPT/i);
  });

  it('attachAttribution appends line to body', () => {
    const out = replyAttributionService.attachAttribution(
      'Mix microbes in clean water first.',
      'compatibility_chart',
      'en',
      { cropType: 'ginger' }
    );
    assert.match(out, /Mix microbes/);
    assert.match(out, /Morbeez/);
    assert.match(out, /tank-mix/i);
  });

  it('does not duplicate attribution when body already tagged', () => {
    const body = 'Advice here.\n\n— Morbeez: Not generic ChatGPT.';
    const out = replyAttributionService.attachAttribution(body, 'verified_case', 'en', {
      cropType: 'ginger',
    });
    assert.equal(out, body);
  });
});
