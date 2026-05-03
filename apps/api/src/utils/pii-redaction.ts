/**
 * Layer 14: PII Redaction + Privacy-First Data Handling
 * GDPR/CCPA-aligned: No PII in logs or AI prompts; anonymized analytics.
 */

export interface RedactionResult {
  redacted: string;
  detectedTypes: string[];
  piiFound: boolean;
}

interface PiiPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const PII_PATTERNS: PiiPattern[] = [
  // Email addresses
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[EMAIL REDACTED]',
  },
  // Full names: "Firstname Lastname"
  {
    name: 'full-name',
    pattern: /\b([A-Z][a-z]{1,20})\s([A-Z][a-z]{1,20})\b/g,
    replacement: '[NAME REDACTED]',
  },
  // Phone numbers: 10-digit sequences
  {
    name: 'phone',
    pattern: /(?:\+91[\s-]?|0)?[6-9]\d{9}\b/g,
    replacement: '[PHONE REDACTED]',
  },
  // Aadhaar: 12 digits
  {
    name: 'aadhaar',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '[AADHAAR REDACTED]',
  },
  // PAN Card: ABCDE1234F pattern
  {
    name: 'pan-card',
    pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    replacement: '[PAN REDACTED]',
  },
  // Dates of birth (ISO: YYYY-MM-DD)
  {
    name: 'date-iso',
    pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g,
    replacement: '[DATE REDACTED]',
  },
  // Dates: DD/MM/YYYY or DD-MM-YYYY
  {
    name: 'date-dmy',
    pattern: /\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](19|20)\d{2}\b/g,
    replacement: '[DATE REDACTED]',
  },
  // IPv4 addresses
  {
    name: 'ipv4',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP REDACTED]',
  },
  // Credit card numbers
  {
    name: 'credit-card',
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    replacement: '[CARD REDACTED]',
  },
  // Generic long numeric sequences
  {
    name: 'long-numeric',
    pattern: /\b\d{10,}\b/g,
    replacement: '[ID REDACTED]',
  },
];

export function redactPII(data: string): RedactionResult {
  if (!data || typeof data !== 'string') {
    return { redacted: '', detectedTypes: [], piiFound: false };
  }

  let redacted = data;
  const detectedTypes: string[] = [];

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(data)) {
      detectedTypes.push(name);
      pattern.lastIndex = 0;
      redacted = redacted.replace(pattern, replacement);
    }
    pattern.lastIndex = 0;
  }

  return {
    redacted,
    detectedTypes,
    piiFound: detectedTypes.length > 0,
  };
}

export function redactPIIString(data: string): string {
  return redactPII(data).redacted;
}

export interface ConsentRecord {
  consentGiven: boolean;
  consentTimestamp?: string;
  consentVersion?: string;
}

export function assertConsent(record: Partial<ConsentRecord>, context = 'data storage'): void {
  if (record && !record.consentGiven) {
    throw new Error(
      `CONSENT_REQUIRED: User consent is required before ${context}. ` +
        'Ensure the user has acknowledged the data storage agreement.'
    );
  }
}

export interface UserRecord {
  uid?: string;
  email?: string;
  displayName?: string;
  phone?: string;
  location?: string;
  electionData?: Record<string, unknown>;
  [key: string]: unknown;
}

export function anonymiseForAnalytics(record: UserRecord): Record<string, unknown> {
  const { uid, email, displayName, phone, ...rest } = record;

  void uid;
  void email;
  void displayName;
  void phone;

  const sanitised: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'string') {
      sanitised[key] = redactPIIString(value);
    } else {
      sanitised[key] = value;
    }
  }

  return sanitised;
}
