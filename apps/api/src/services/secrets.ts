/**
 * Secret Management Service
 * Handles secure retrieval and caching of secrets
 * Supports Google Cloud Secret Manager and environment variables
 */

interface SecretCache {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, SecretCache>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Get secret from environment or Secret Manager
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Try environment variable first (for local development)
  const envValue = process.env[secretName];
  if (envValue !== undefined) {
    cacheSecret(secretName, envValue);
    return envValue;
  }

  // In production, use Google Cloud Secret Manager
  if (process.env.NODE_ENV === 'production') {
    try {
      const secret = await getSecretFromGCP(secretName);
      cacheSecret(secretName, secret);
      return secret;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      throw new Error(`Secret ${secretName} not found`);
    }
  }

  throw new Error(`Secret ${secretName} not found`);
}

/**
 * Cache secret with TTL
 */
function cacheSecret(secretName: string, value: string): void {
  secretCache.set(secretName, {
    value,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

/**
 * Get secret from Google Cloud Secret Manager
 */
async function getSecretFromGCP(secretName: string): Promise<string> {
  try {
    // This would use the Google Cloud Secret Manager client
    // For now, we'll use environment variables as fallback
    const value = process.env[secretName];
    if (!value) {
      throw new Error(`Secret ${secretName} not found in environment`);
    }
    return value;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to get secret from GCP: ${secretName}`, error);
    throw error;
  }
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
    // eslint-disable-next-line no-console
    console.error('Secret validation failed:', error);
    return false;
  }
}

/**
 * Clear secret cache (useful for testing)
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Mask secret for logging
 */
export function maskSecret(secret: string, visibleChars: number = 4): string {
  // If visible chars is 0, mask everything
  if (visibleChars === 0) {
    return '*'.repeat(secret.length);
  }
  // If visible chars >= length, return unmasked
  if (visibleChars >= secret.length) {
    return secret;
  }
  const visible = secret.substring(0, visibleChars);
  // Always use 4 asterisks for masking
  const masked = '*'.repeat(4);
  return visible + masked;
}

/**
 * Validate API key format
 */
export function isValidApiKey(key: string): boolean {
  // API keys should be at least 32 characters
  return key.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(key);
}

/**
 * Validate database connection string
 */
export function isValidConnectionString(connStr: string): boolean {
  // Basic validation - should start with protocol
  return /^[a-z]+:\/\//.test(connStr);
}
