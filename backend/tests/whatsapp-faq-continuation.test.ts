import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { faqKeywordMatches, shouldSkipFaqForMessage } from '../src/services/whatsapp/pipeline/faq-cache.service.js';
import {
  isConversationFollowUp,
  isDrenchOrMixQuestion,
} from '../src/services/whatsapp/pipeline/conversation-continuation.service.js';
import { isExplicitAgronomyQuestion } from '../src/services/whatsapp/pipeline/agriculture-free-text.service.js';

describe('FAQ keyword matching', () => {
  it('does not treat "this" as greeting hi', () => {
    assert.equal(faqKeywordMatches('could you explain this in more detail?', 'hi'), false);
  });

  it('matches standalone hi', () => {
    assert.equal(faqKeywordMatches('hi', 'hi'), true);
    assert.equal(faqKeywordMatches('hi morbeez', 'hi'), true);
  });
});

describe('conversation continuation', () => {
  it('detects explain-in-more-detail follow-up', () => {
    assert.equal(isConversationFollowUp('Could you explain this in more detail?'), true);
    assert.equal(shouldSkipFaqForMessage('Could you explain this in more detail?'), true);
  });

  it('detects drench mix list as agronomy', () => {
    const list = `Trichoderma - 300 ml
Pseudomonas - 300 ml
Per Drenching 200 ltr for ginger`;
    assert.equal(isDrenchOrMixQuestion(list), true);
    assert.equal(isExplicitAgronomyQuestion('This is correct mix?'), true);
  });
});
