import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inputClassifierService } from '../src/services/whatsapp/pipeline/input-classifier.service.js';
import { imageInputClassifierService } from '../src/services/whatsapp/pipeline/image-input-classifier.service.js';
import {
  parseProductPairFromText,
} from '../src/services/whatsapp/pipeline/compatibility-lookup.service.js';
import { seasonalPriorityService } from '../src/services/whatsapp/pipeline/seasonal-priority.service.js';

describe('vision merge', () => {
  it('maps vision insect to agriculture category', () => {
    const cat = imageInputClassifierService.toAgricultureCategory({
      primaryCategory: 'insect',
      confidence: 0.82,
      photoQuality: 'ok',
      hints: [],
    });
    assert.equal(cat, 'insect');
  });

  it('prefers vision when much stronger than text', () => {
    const text = inputClassifierService.classifyText('', { hasCropMedia: true });
    const merged = inputClassifierService.mergeWithVision(text, {
      category: 'weed',
      confidence: 0.88,
      photoQuality: 'ok',
    });
    assert.equal(merged.category, 'weed');
    assert.ok(merged.confidence >= 0.8);
  });
});

describe('compatibility parse', () => {
  it('extracts product pair from mix question', () => {
    const pair = parseProductPairFromText('Can I mix Mancozeb and Copper oxychloride in tank?');
    assert.ok(pair);
    assert.match(pair!.productA, /Mancozeb/i);
    assert.match(pair!.productB, /Copper/i);
  });
});

describe('seasonal priority', () => {
  it('boosts priority in monsoon months', () => {
    const july = new Date('2026-07-15T12:00:00+05:30');
    const boosted = seasonalPriorityService.adjustBroadcastPriority(50, july);
    assert.ok(boosted > 50);
  });
});
