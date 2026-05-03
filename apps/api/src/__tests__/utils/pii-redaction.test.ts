/**
 * Test Suite: Layer 14 – PII Redaction + Privacy & Consent
 * 13 tests covering PII detection, redaction accuracy, consent enforcement,
 * and anonymisation for BigQuery export.
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

describe('Layer 14: PII Redaction + Privacy & Consent', () => {
  // ── Email ─────────────────────────────────────────────────────────────────

  test('L14-01: email address is redacted', () => {
    const result = redactPII('Contact us at sujith@example.com for help.');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('email');
    expect(result.redacted).toContain('[EMAIL REDACTED]');
    expect(result.redacted).not.toContain('sujith@example.com');
  });

  // ── Phone / Aadhaar ───────────────────────────────────────────────────────

  test('L14-02: Indian mobile number is redacted', () => {
    const result = redactPII('Call me at 9876543210 for queries.');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('phone');
    expect(result.redacted).toContain('[PHONE REDACTED]');
    expect(result.redacted).not.toContain('9876543210');
  });

  test('L14-03: Aadhaar-like 12-digit number is redacted', () => {
    const result = redactPII('My Aadhaar is 123456789012.');
    expect(result.piiFound).toBe(true);
    // Could match aadhaar or long-numeric pattern
    const hasAadhaarOrLong = result.detectedTypes.some(
      (t) => t.includes('aadhaar') || t.includes('long')
    );
    expect(hasAadhaarOrLong).toBe(true);
    expect(result.redacted).not.toContain('123456789012');
  });

  // ── Full name ─────────────────────────────────────────────────────────────

  test('L14-04: full name (Firstname Lastname) is redacted', () => {
    const result = redactPII('The applicant Sujith Putta submitted the form.');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('full-name');
    expect(result.redacted).toContain('[NAME REDACTED]');
    expect(result.redacted).not.toContain('Sujith Putta');
  });

  // ── PAN Card ─────────────────────────────────────────────────────────────

  test('L14-05: PAN card number is redacted', () => {
    const result = redactPII('PAN: ABCDE1234F');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('pan-card');
    expect(result.redacted).toContain('[PAN REDACTED]');
  });

  // ── Date of birth ─────────────────────────────────────────────────────────

  test('L14-06: ISO date of birth is redacted', () => {
    const result = redactPII('DOB: 1995-07-14 as per records.');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('date-iso');
    expect(result.redacted).toContain('[DATE REDACTED]');
    expect(result.redacted).not.toContain('1995-07-14');
  });

  // ── IP Address ────────────────────────────────────────────────────────────

  test('L14-07: IPv4 address is redacted from log strings', () => {
    const result = redactPII('Request from 192.168.1.100 was blocked.');
    expect(result.piiFound).toBe(true);
    expect(result.detectedTypes).toContain('ipv4');
    expect(result.redacted).toContain('[IP REDACTED]');
    expect(result.redacted).not.toContain('192.168.1.100');
  });

  // ── Multi-PII ─────────────────────────────────────────────────────────────

  test('L14-08: multiple PII types in one string are all redacted', () => {
    const input = 'User Rahul Gupta, email: rahul@test.com, phone: 8765432109';
    const result = redactPII(input);
    expect(result.piiFound).toBe(true);
    expect(result.redacted).not.toContain('rahul@test.com');
    expect(result.redacted).not.toContain('8765432109');
    expect(result.redacted).not.toContain('Rahul Gupta');
  });

  // ── Clean input ───────────────────────────────────────────────────────────

  test('L14-09: PII-free string passes through unchanged', () => {
    const input = 'Election day is on the first Tuesday after the first Monday in November.';
    const result = redactPII(input);
    expect(result.piiFound).toBe(false);
    expect(result.detectedTypes).toHaveLength(0);
    expect(result.redacted).toBe(input);
  });

  // ── redactPIIString convenience wrapper ───────────────────────────────────

  test('L14-10: redactPIIString returns only the redacted string', () => {
    const cleaned = redactPIIString('sujith@civiq.app called 9123456789');
    expect(typeof cleaned).toBe('string');
    expect(cleaned).not.toContain('@civiq.app');
    expect(cleaned).not.toContain('9123456789');
  });

  // ── Consent enforcement ───────────────────────────────────────────────────

  test('L14-11: assertConsent throws when consent is false', () => {
    const record: ConsentRecord = { consentGiven: false };
    expect(() => assertConsent(record, 'election data storage')).toThrow('CONSENT_REQUIRED');
  });

  test('L14-12: assertConsent passes when consent is true', () => {
    const record: ConsentRecord = {
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      consentVersion: '1.0',
    };
    expect(() => assertConsent(record)).not.toThrow();
  });

  // ── Analytics anonymisation ───────────────────────────────────────────────

  test('L14-13: anonymiseForAnalytics strips direct identifiers', () => {
    const user: UserRecord = {
      uid: 'user123',
      email: 'user@example.com',
      displayName: 'Test User',
      phone: '9876543210',
      location: 'Mumbai',
      electionData: { step: 3, completedAt: '2026-05-01' },
    };
    const anon = anonymiseForAnalytics(user);
    expect(anon).not.toHaveProperty('uid');
    expect(anon).not.toHaveProperty('email');
    expect(anon).not.toHaveProperty('displayName');
    expect(anon).not.toHaveProperty('phone');
    expect(anon).toHaveProperty('location');
    expect(anon).toHaveProperty('electionData');
  });
});
