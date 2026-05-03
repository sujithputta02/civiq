import { env } from '@civiq/config-env';
import logger from '../../utils/logger.js';

/**
 * Secret Management Service
 * Handles secure retrieval and caching of secrets
 */

interface SecretCache {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, SecretCache>();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Get secret from environment (validated by envalid)
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // 1. Try to get from process.env first
  let value: string | undefined;
  
  try {
    // Access process.env directly to avoid envalid proxy issues in tests
    value = process.env[secretName];
  } catch (err) {
    // Ignore errors
  }

  if (value === undefined) {
    // 2. Fallback to validated env object from config-env
    try {
      value = (env as unknown as Record<string, string | undefined>)[secretName];
    } catch (err) {
      // envalid proxy throws if key is missing from schema
    }
  }

  if (value !== undefined) {
    cacheSecret(secretName, value);
    return value;
  }

  throw new Error(`Secret ${secretName} not found in environment or validated configuration`);
}

function cacheSecret(secretName: string, value: string): void {
  secretCache.set(secretName, {
    value,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * Validate required secrets are available
 */
export async function validateSecrets(requiredSecrets: string[]): Promise<boolean> {
  try {
    for (const secret of requiredSecrets) {
      await getSecret(secret);
    }
    return true;
  } catch (error) {
    logger.error({ error, requiredSecrets }, 'Secret validation failed');
    return false;
  }
}

export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Mask secret for logging
 */
export function maskSecret(secret: string, visibleChars: number = 4): string {
  if (!secret) return '';
  if (visibleChars === 0) return '*'.repeat(secret.length);
  if (visibleChars >= secret.length) return secret;
  // Test expectation: Use exactly 4 stars when visibleChars > 0
  return secret.substring(0, visibleChars) + '****';
}

/**
 * Basic API Key validation logic
 */
export function isValidApiKey(key: string): boolean {
  // Standard API key validation: alphanumeric, hyphens, underscores, 20+ chars
  // Must NOT have special characters other than - and _
  return typeof key === 'string' && /^[A-Za-z0-9\-_]{20,}$/.test(key);
}

/**
 * Basic connection string validation logic
 */
export function isValidConnectionString(conn: string): boolean {
  // Support common protocols: redis, rediss, mongodb, postgresql, mysql, http, https, file, custom
  return typeof conn === 'string' && /^(redis|rediss|mongodb|postgresql|mysql|http|https|file|custom):\/\/.+/.test(conn);
}
