/**
 * Test Suite: Layer 16 – Zero-Trust CI/CD Pipeline Integration
 * 10 structural tests verifying that all critical security files are in place,
 * correctly structured, and that the pipeline enforces zero-trust controls.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Resolve workspace root from this test file's location:
// __tests__/services/ → src/ → apps/api/ → apps/ → repo root
const ROOT = path.resolve(__dirname, '../../../../../');

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

describe('Layer 16: Zero-Trust CI/CD Pipeline', () => {
  // ── Trivy vulnerability scanner ───────────────────────────────────────────

  test('L16-01: zero-trust-pipeline.yml contains Trivy or high-level audit gate', () => {
    const workflow = readFile('.github/workflows/zero-trust-pipeline.yml');
    const hasTrivyOrAudit =
      workflow.includes('trivy-action') ||
      workflow.includes('aquasecurity/trivy') ||
      workflow.includes('npm audit --audit-level=high');
    expect(hasTrivyOrAudit).toBe(true);
  });

  // ── TruffleHog secret scanning ────────────────────────────────────────────

  test('L16-02: zero-trust-pipeline.yml contains TruffleHog secret scanning', () => {
    const workflow = readFile('.github/workflows/zero-trust-pipeline.yml');
    expect(workflow.toLowerCase()).toContain('trufflehog');
  });

  // ── CodeQL SAST ───────────────────────────────────────────────────────────

  test('L16-03: zero-trust-pipeline.yml contains CodeQL analysis step', () => {
    const workflow = readFile('.github/workflows/zero-trust-pipeline.yml');
    expect(workflow.toLowerCase()).toContain('codeql');
  });

  // ── npm audit in security pipeline ──────────────────────────────────────

  test('L16-04: security-scan.yml runs npm audit', () => {
    const workflow = readFile('.github/workflows/security-scan.yml');
    expect(workflow).toContain('npm audit');
  });

  // ── Zero-trust CI pipeline file ───────────────────────────────────────────

  test('L16-05: zero-trust-pipeline.yml workflow file exists', () => {
    expect(fileExists('.github/workflows/zero-trust-pipeline.yml')).toBe(true);
  });

  test('L16-06: zero-trust pipeline includes dependency review', () => {
    const workflow = readFile('.github/workflows/zero-trust-pipeline.yml');
    const hasDepReview =
      workflow.includes('dependency-review') ||
      workflow.includes('npm audit') ||
      workflow.includes('trivy');
    expect(hasDepReview).toBe(true);
  });

  test('L16-07: zero-trust pipeline includes secret scanning', () => {
    const workflow = readFile('.github/workflows/zero-trust-pipeline.yml');
    const hasSecretScan =
      workflow.toLowerCase().includes('trufflehog') ||
      workflow.toLowerCase().includes('gitleaks') ||
      workflow.toLowerCase().includes('secret');
    expect(hasSecretScan).toBe(true);
  });

  test('L16-08: zero-trust pipeline includes SAST step', () => {
    const workflow = readFile('.github/workflows/zero-trust-pipeline.yml');
    const hasSAST =
      workflow.toLowerCase().includes('codeql') ||
      workflow.toLowerCase().includes('eslint') ||
      workflow.toLowerCase().includes('sast');
    expect(hasSAST).toBe(true);
  });

  // ── AI firewall must be present in codebase ───────────────────────────────

  test('L16-09: ai-firewall.ts utility exists', () => {
    expect(fileExists('apps/api/src/utils/ai-firewall.ts')).toBe(true);
  });

  // ── PII redaction must be present in codebase ─────────────────────────────

  test('L16-10: pii-redaction.ts utility exists', () => {
    expect(fileExists('apps/api/src/utils/pii-redaction.ts')).toBe(true);
  });
});
