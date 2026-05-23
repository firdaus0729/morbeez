import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isValidIndianPhone } from '../src/lib/phone.js';

describe('normalizePhone', () => {
  it('adds 91 prefix to 10-digit numbers', () => {
    assert.equal(normalizePhone('9876543210'), '919876543210');
  });

  it('keeps 12-digit 91 prefix', () => {
    assert.equal(normalizePhone('919876543210'), '919876543210');
  });
});

describe('isValidIndianPhone', () => {
  it('accepts valid mobile', () => {
    assert.equal(isValidIndianPhone('9876543210'), true);
  });

  it('rejects invalid numbers', () => {
    assert.equal(isValidIndianPhone('12345'), false);
    assert.equal(isValidIndianPhone('5876543210'), false);
  });
});
