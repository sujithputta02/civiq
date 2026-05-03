import { logSecurityEvent } from '../modules/security/audit.service.js';

/**
 * Layer 13: AI Prompt Injection Firewall
 */

export interface FirewallResult {
  sanitized: string;
  risk: 'low' | 'medium' | 'high';
  blocked: boolean;
  matchedPatterns: string[];
}

const INJECTION_PATTERNS: { pattern: RegExp; name: string }[] = [
  {
    pattern: /ignore\s+(previous|all|above|prior)\s+(instructions?|prompt|context)/i,
    name: 'ignore-instructions',
  },
  {
    pattern: /forget\s+(everything|all|previous|your\s+instructions?)/i,
    name: 'forget-instructions',
  },
  {
    pattern: /disregard\s+(previous|all|your)\s+(\w+\s+)?(instructions?|rules?|prompt)/i,
    name: 'disregard-instructions',
  },
  { pattern: /you\s+are\s+now\s+(a\s+)?(?!civiq|an?\s+assistant)/i, name: 'role-hijack' },
  { pattern: /act\s+as\s+(if\s+you\s+(are|were)|a\s+)?(?!civiq)/i, name: 'act-as-hijack' },
  { pattern: /pretend\s+(you\s+are|to\s+be)/i, name: 'pretend-hijack' },
  { pattern: /override\s+(your\s+)?(role|rules?|instructions?|system)/i, name: 'override-role' },
  { pattern: /from\s+now\s+on\s+you\s+(are|will|must)/i, name: 'role-redefine' },
  { pattern: /system\s+prompt/i, name: 'system-prompt-extract' },
  {
    pattern: /reveal\s+(your\s+)?(system|initial|original)\s+(prompt|instructions?)/i,
    name: 'reveal-prompt',
  },
  {
    pattern: /what\s+(are|were)\s+your\s+(initial|original|system)\s+instructions?/i,
    name: 'instruction-extract',
  },
  {
    pattern: /print\s+(your\s+)?(system|full|complete)\s+(prompt|instructions?)/i,
    name: 'print-prompt',
  },
  { pattern: /jailbreak/i, name: 'jailbreak-keyword' },
  { pattern: /DAN\s+(mode|prompt)/i, name: 'dan-mode' },
  { pattern: /developer\s+mode/i, name: 'developer-mode' },
  { pattern: /god\s+mode/i, name: 'god-mode' },
  { pattern: /unrestricted\s+mode/i, name: 'unrestricted-mode' },
  { pattern: /\n\s*```/m, name: 'hidden-codeblock' },
  { pattern: /\\n\s*```/, name: 'escaped-newline-codeblock' },
  { pattern: /\n\s*#{1,6}\s+(?:ignore|forget|override|system)/im, name: 'markdown-injection' },
  { pattern: /\u0131gnore|\u00ECgnore|\u1EC9gnore/i, name: 'unicode-ignore' },
  { pattern: /\u0455ystem|\u0073\u200Bystem/i, name: 'unicode-system' },
  { pattern: /---\s*(END|STOP)\s+PROMPT\s*---/i, name: 'delimiter-attack' },
  { pattern: /<<<\s*SYSTEM\s*>>>/i, name: 'bracket-system' },
  { pattern: /\[SYSTEM\]/i, name: 'bracket-tag-system' },
  { pattern: /<\s*\/?system\s*>/i, name: 'html-system-tag' },
  { pattern: /send\s+(to|email|http|this\s+to)/i, name: 'exfiltration-attempt' },
  { pattern: /curl\s+https?:\/\//i, name: 'curl-exfiltration' },
  { pattern: /fetch\(["']https?:\/\//i, name: 'fetch-exfiltration' },
  {
    pattern: /http[s]?:\/\/(?:localhost|127\.\d|0\.0\.0\.0|internal|metadata\.google)/i,
    name: 'ssrf-url',
  },
];

const HIGH_RISK_THRESHOLD = 2;

export function aiPromptFirewall(input: string, userId?: string): FirewallResult {
  if (!input || typeof input !== 'string') {
    return { sanitized: '', risk: 'low', blocked: false, matchedPatterns: [] };
  }

  const matchedPatterns: string[] = [];
  for (const { pattern, name } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(name);
    }
  }

  const risk: 'low' | 'medium' | 'high' =
    matchedPatterns.length === 0
      ? 'low'
      : matchedPatterns.length >= HIGH_RISK_THRESHOLD
        ? 'high'
        : 'medium';

  const blocked = risk === 'high';

  let sanitized = input
    .replace(/ignore\s+previous\s+instructions?/gi, '[REDACTED]')
    .replace(/system\s+prompt/gi, '[PROMPT REDACTED]')
    .replace(/forget\s+everything/gi, '[REDACTED]')
    .replace(/you\s+are\s+now/gi, '[REDACTED]')
    .replace(/jailbreak/gi, '[REDACTED]')
    .replace(/\n\s*```/gm, '\n[CODE BLOCK REMOVED]')
    .replace(/\\n\s*```/g, '[CODE BLOCK REMOVED]')
    .replace(/<\s*\/?system\s*>/gi, '[TAG REMOVED]');

  // Remove zero-width and control characters individually to satisfy lint
  sanitized = sanitized
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00AD/g, '');

  if (risk !== 'low') {
    const snippet = input.substring(0, 80).replace(/\n/g, '\\n');
    logSecurityEvent(
      'AI_INJECTION_ATTEMPT',
      userId ?? 'anonymous',
      { inputSnippet: snippet, risk, matchedPatterns, blocked },
      risk === 'high' ? 'HIGH' : 'MEDIUM'
    ).catch(() => {});
  }

  return { sanitized, risk, blocked, matchedPatterns };
}

export function assertSafeForAI(input: string, userId?: string): string {
  const result = aiPromptFirewall(input, userId);
  if (result.blocked) {
    throw new Error('AI_FIREWALL_BLOCKED: Input contains high-risk injection patterns.');
  }
  return result.sanitized;
}
