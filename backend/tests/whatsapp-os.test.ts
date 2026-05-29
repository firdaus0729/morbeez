import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inputClassifierService } from '../src/services/whatsapp/pipeline/input-classifier.service.js';
import { responseComposerService } from '../src/services/whatsapp/pipeline/response-composer.service.js';
import { assessmentPlaybookService } from '../src/services/whatsapp/scenarios/assessment-playbook.service.js';
import { normalizeMenuId } from '../src/services/whatsapp/scenarios/whatsapp-menu.service.js';

describe('input classifier', () => {
  it('detects insect intent', () => {
    const r = inputClassifierService.classifyText('caterpillar on ginger leaves', { hasCropMedia: true });
    assert.equal(r.category, 'insect');
    assert.ok(r.confidence >= 0.5);
  });

  it('detects weed intent', () => {
    const r = inputClassifierService.classifyText('unknown weed spreading in field');
    assert.equal(r.category, 'weed');
  });

  it('defaults media-only to disease_stress', () => {
    const r = inputClassifierService.classifyText('', { hasCropMedia: true });
    assert.equal(r.category, 'disease_stress');
  });
});

describe('response composer', () => {
  it('appends a single validation question', () => {
    const out = responseComposerService.compose({
      body: 'Possible leaf spot noticed.',
      validationQuestion: 'Are lower leaves affected first?',
    });
    assert.match(out, /Possible leaf spot/);
    assert.match(out, /lower leaves affected first\?/);
  });

  it('truncates very long bodies', () => {
    const out = responseComposerService.compose({
      body: 'x'.repeat(2000),
      maxChars: 500,
    });
    assert.ok(out.length <= 500);
  });
});

describe('assessment playbook', () => {
  it('runs full crop doctor when insect text includes a photo', () => {
    const classification = inputClassifierService.classifyText('caterpillar chewing leaves');
    const result = assessmentPlaybookService.resolve(classification, 'en', { hasCropMedia: true });
    assert.equal(result.action, 'continue_diagnosis');
  });

  it('returns insect playbook for text-only low-context messages', () => {
    const classification = inputClassifierService.classifyText('caterpillar chewing leaves');
    const result = assessmentPlaybookService.resolve(classification, 'en', { hasCropMedia: false });
    assert.equal(result.action, 'reply');
    if (result.action === 'reply') {
      assert.match(result.message, /insect|pest/i);
      assert.match(result.message, /\?/);
    }
  });

  it('continues diagnosis for disease keywords', () => {
    const classification = inputClassifierService.classifyText('leaf blight fungal spots on ginger');
    const result = assessmentPlaybookService.resolve(classification, 'en', { hasCropMedia: true });
    assert.equal(result.action, 'continue_diagnosis');
  });
});

describe('menu ids', () => {
  it('normalizes legacy diagnosis id', () => {
    assert.equal(normalizeMenuId('menu.diagnosis'), 'menu.crop_assessment');
  });
});
