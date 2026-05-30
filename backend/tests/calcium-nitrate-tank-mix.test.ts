import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lookupCalciumNitratePair,
  CALCIUM_NITRATE_MIX_WARNING,
} from '../src/services/whatsapp/pipeline/calcium-nitrate-tank-mix.knowledge.js';
import {
  compatibilityLookupService,
  parseProductPairFromText,
} from '../src/services/whatsapp/pipeline/compatibility-lookup.service.js';

describe('Calcium Nitrate tank-mix chart', () => {
  it('rejects magnesium sulphate with Ca nitrate', () => {
    const r = lookupCalciumNitratePair('calcium nitrate', 'magnesium sulphate');
    assert.ok(r?.found);
    assert.equal(r?.compatible, false);
    assert.match(r?.notes ?? '', /precipitat|separate/i);
  });

  it('allows urea with Ca nitrate', () => {
    const r = lookupCalciumNitratePair('Calcium Nitrate', 'urea');
    assert.ok(r?.found);
    assert.equal(r?.compatible, true);
  });

  it('rejects DAP with Ca nitrate', () => {
    const r = lookupCalciumNitratePair('calcium nitrate', 'dap');
    assert.ok(r?.found);
    assert.equal(r?.compatible, false);
  });

  it('parses and resolves farmer WhatsApp phrasing', async () => {
    const pair = parseProductPairFromText(
      'Can calcium nitrate with magnesium sulphate mix ?'
    );
    assert.ok(pair);
    const lookup = await compatibilityLookupService.lookup(pair!.productA, pair!.productB);
    assert.equal(lookup.found, true);
    assert.equal(lookup.compatible, false);
    const reply = compatibilityLookupService.formatFarmerReply(lookup, 'en', pair!);
    assert.match(reply, /do not mix|Morbeez/i);
    assert.match(reply, new RegExp(CALCIUM_NITRATE_MIX_WARNING.slice(0, 20)));
  });
});
