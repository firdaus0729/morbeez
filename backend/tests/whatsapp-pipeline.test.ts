import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguageFromText } from '../src/services/whatsapp/pipeline/language-detection.service.js';
import { validateAgricultureIntent } from '../src/services/whatsapp/pipeline/agriculture-guard.service.js';
import { assessImageBuffer } from '../src/services/whatsapp/pipeline/image-quality.service.js';

describe('language detection', () => {
  it('detects Malayalam script', () => {
    assert.equal(detectLanguageFromText('എന്റെ ഇഞ്ചി വിളയിൽ രോഗം'), 'ml');
  });

  it('defaults to English for Latin text', () => {
    assert.equal(detectLanguageFromText('ginger leaf disease'), 'en');
  });
});

describe('agriculture guard', () => {
  it('blocks off-topic long text', () => {
    const r = validateAgricultureIntent({
      text: 'tell me about bitcoin trading strategies for beginners',
      hasCropMedia: false,
    });
    assert.equal(r.allowed, false);
  });

  it('allows crop media without text', () => {
    const r = validateAgricultureIntent({ text: '', hasCropMedia: true });
    assert.equal(r.allowed, true);
  });
});

describe('image quality', () => {
  it('rejects tiny buffers', () => {
    const r = assessImageBuffer(Buffer.alloc(100), 'image/jpeg');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'too_small');
  });
});
