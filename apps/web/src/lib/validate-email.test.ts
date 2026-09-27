import { describe, expect, it } from 'vitest';
import { isValidEmail } from './validate-email';

describe('isValidEmail', () => {
  it('accepts a normal email', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects whitespace-only input', () => {
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('person@')).toBe(false);
  });

  it('accepts an email with surrounding whitespace', () => {
    expect(isValidEmail('  person@example.com  ')).toBe(true);
  });
});
