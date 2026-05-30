import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inferCropHint } from '../src/services/whatsapp/pipeline/crop-hints.js';
import { farmerMemoryService } from '../src/services/whatsapp/pipeline/farmer-memory.service.js';
import type { FarmerMemorySnapshot } from '../src/services/whatsapp/pipeline/farmer-memory.service.js';

describe('crop hints', () => {
  it('detects ginger from English and Malayalam', () => {
    assert.equal(inferCropHint('my ginger leaves are yellow'), 'ginger');
    assert.equal(inferCropHint('ഇഞ്ചി ഇല'), 'ginger');
  });
});

describe('farmer memory formatting', () => {
  const base: FarmerMemorySnapshot = {
    farmerId: 'f1',
    cropType: 'ginger',
    activePlotId: 'plot-1',
    recentIssues: 'thrips (medium)',
    recentTurns: [
      'Farmer: Can calcium nitrate mix with magnesium sulphate?',
      'Assistant: Do not mix in same tank.',
    ],
    knownCropLocked: true,
    onboardingComplete: true,
    dap: 120,
    district: 'Wayanad',
  };

  it('includes crop and recent chat in compact history', () => {
    const compact = farmerMemoryService.formatCompactHistory(base);
    assert.match(compact, /Active crop: ginger/);
    assert.match(compact, /120 DAP/);
    assert.match(compact, /calcium nitrate/i);
  });

  it('tells OpenAI not to re-ask crop in conversation block', () => {
    const block = farmerMemoryService.formatConversationBlock(base);
    assert.match(block, /do NOT ask which crop/i);
    assert.match(block, /Known crop: ginger/);
  });

  it('memory-aware fallback references known crop', () => {
    const msg = farmerMemoryService.memoryAwareFallback(base, 'en');
    assert.match(msg, /ginger/i);
    assert.doesNotMatch(msg, /Welcome to Morbeez/i);
  });

  it('knowsCrop when plot or onboarding locked', () => {
    assert.equal(farmerMemoryService.knowsCrop(base), true);
    assert.equal(
      farmerMemoryService.knowsCrop({ ...base, knownCropLocked: false, activePlotId: null }),
      false
    );
  });
});
