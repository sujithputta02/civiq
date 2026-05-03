/**
 * Enhanced Test Suite for PII Redaction - 100% Coverage
 */

import { describe, test, expect } from 'vitest';
import {
  redactPII,
  redactPIIString,
  assertConsent,
  anonymiseForAnalytics,
  type ConsentRecord,
  type UserRecord,
} from '../../utils/pii-redaction.js';

describe('PII Redaction - Enhanced Coverage', () => {
  // ── Edge Cases ────────────────────────────────────────────────────────────

  test('empty string returns empty result', () => {
    const result = redactPII('');
    expect(result.redacted).toBe('');
    expect(result.piiFound).toBe(false);
    expect(result.detectedTypes).toHaveLength(0);
  });

  test('null input returns empty result', () => {
    const result = redactPII(null as unknown as string);
    expect(result.redacted).toBe('');
    expect(result.piiFound).toBe(false);
  });

  test('undefined input returns empty result', () => {
    const result = redactPII(undefined as unknown as string);
    expect(result.redacted).toBe('');
    expect(result.piiFound).toBe(false);
  });

  test('non-string input returns empty result', () => {
    const result = redactPII(123 as unknown as string);
    expect(result.redacted).toBe('');
    expect(result.piiFound).toBe(false);
  });

  test('credit card number is redacted', () => {
    const result = redactPII('Card: 1234 5678 9012 3456');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('credit-card');
    expect(result.redacted).toContain('[CARD REDACTED]');
  });

  test('DD/MM/YYYY date format is redacted', () => {
    const result = redactPII('Date: 14/07/1995');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('date-dmy');
    expect(result.redacted).toContain('[DATE REDACTED]');
  });

  test('long numeric sequence is redacted', () => {
    const result = redactPII('ID: 12345678901234');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('long-numeric');
    expect(result.redacted).toContain('[ID REDACTED]');
  });

  test('anonymiseForAnalytics handles nested PII in strings', () => {
    const user: UserRecord = {
      uid: 'user123',
      email: 'user@example.com',
      displayName: 'Test User',
      phone: '9876543210',
      location: 'Contact: admin@example.com',
      notes: 'Call 9123456789 for details',
    };
    const anon = anonymiseForAnalytics(user);
    expect(anon.location).not.toContain('admin@example.com');
    expect(anon.notes).not.toContain('9123456789');
  });

  test('anonymiseForAnalytics handles non-string values', () => {
    const user: UserRecord = {
      uid: 'user123',
      email: 'user@example.com',
      age: 30,
      active: true,
      metadata: { key: 'value' },
    };
    const anon = anonymiseForAnalytics(user);
    expect(anon.age).toBe(30);
    expect(anon.active).toBe(true);
    expect(anon.metadata).toEqual({ key: 'value' });
  });

  test('assertConsent with partial record', () => {
    const record: Partial<ConsentRecord> = {};
    expect(() => assertConsent(record)).not.toThrow();
  });

  test('assertConsent with custom context', () => {
    const record: ConsentRecord = { consentGiven: false };
    expect(() => assertConsent(record, 'custom operation')).toThrow('custom operation');
  });

  test('redactPIIString with empty input', () => {
    expect(redactPIIString('')).toBe('');
    expect(redactPIIString(null as unknown as string)).toBe('');
  });

  test('multiple emails in one string', () => {
    const result = redactPII('Contact: admin@example.com or support@example.com');
    expect(result.piiFound).toBe(true);
    expect(result.redacted).not.toContain('admin@example.com');
    expect(result.redacted).not.toContain('support@example.com');
  });

  test('Aadhaar with spaces', () => {
    const result = redactPII('Aadhaar: 1234 5678 9012');
    expect(result.piiFound).toBe(true);
    expect(result.redacted).not.toContain('1234 5678 9012');
  });

  test('Aadhaar with hyphens', () => {
    const result = redactPII('Aadhaar: 1234-5678-9012');
    expect(result.piiFound).toBe(true);
    expect(result.redacted).not.toContain('1234-5678-9012');
  });

  test('phone with +91 prefix', () => {
    const result = redactPII('Phone: +91 9876543210');
    expect(result.piiFound).toBe(true);
    expect(result.redacted).not.toContain('9876543210');
  });

  test('phone with 0 prefix', () => {
    const result = redactPII('Phone: 09876543210');
    expect(result.piiFound).toBe(true);
    expect(result.redacted).not.toContain('9876543210');
  });
});
