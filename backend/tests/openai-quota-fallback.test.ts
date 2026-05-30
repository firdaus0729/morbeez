import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenAiHttpError } from '../src/services/ai/openai-quota.service.js';
import { advisoryFromKnowledgeText } from '../src/services/whatsapp/pipeline/knowledge-fallback.service.js';

describe('OpenAI quota detection', () => {
  it('detects insufficient_quota from JSON body', () => {
    const body = JSON.stringify({
      error: {
        code: 'insufficient_quota',
        type: 'insufficient_quota',
        message: 'You exceeded your current quota, please check your plan and billing details.',
      },
    });
    const info = parseOpenAiHttpError(429, body);
    assert.equal(info.isQuotaIssue, true);
    assert.equal(info.errorCode, 'insufficient_quota');
  });

  it('does not flag generic 500 as quota', () => {
    const info = parseOpenAiHttpError(500, '{"error":{"message":"internal"}}');
    assert.equal(info.isQuotaIssue, false);
  });
});

describe('knowledge advisory snapshot', () => {
  it('builds farmer-facing summary from fallback text', () => {
    const a = advisoryFromKnowledgeText('Do not mix Ca nitrate with MgSO4.', 'en');
    assert.match(a.farmerSummaryEn, /Ca nitrate/i);
    assert.equal(a.uncertain, true);
  });
});
