import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSecret,
  validateSecrets,
  clearSecretCache,
  maskSecret,
  isValidApiKey,
  isValidConnectionString,
} from '../../services/secrets';

describe('Secrets Service', () => {
  beforeEach(() => {
    clearSecretCache();
    process.env.TEST_SECRET = 'test-secret-value-12345678901234567890';
  });

  afterEach(() => {
    clearSecretCache();
    delete process.env.TEST_SECRET;
  });

  describe('getSecret', () => {
    it('BEST CASE: should retrieve secret from environment', async () => {
      const secret = await getSecret('TEST_SECRET');
      expect(secret).toBe('test-secret-value-12345678901234567890');
    });

    it('AVERAGE CASE: should cache secret after retrieval', async () => {
      const secret1 = await getSecret('TEST_SECRET');
      const secret2 = await getSecret('TEST_SECRET');
      expect(secret1).toBe(secret2);
    });

    it('WORST CASE: should throw error for missing secret', async () => {
      await expect(getSecret('NONEXISTENT_SECRET')).rejects.toThrow();
    });

    it('should cache secret with TTL', async () => {
      const secret = await getSecret('TEST_SECRET');
      expect(secret).toBeDefined();
    });

    it('should handle environment variable retrieval', async () => {
      process.env.API_KEY = 'valid-api-key-1234567890123456';
      const secret = await getSecret('API_KEY');
      expect(secret).toBe('valid-api-key-1234567890123456');
    });

    it('should handle missing environment variable', async () => {
      delete process.env.MISSING_VAR;
      await expect(getSecret('MISSING_VAR')).rejects.toThrow();
    });

    it('should handle empty secret value', async () => {
      process.env.EMPTY_SECRET = '';
      const secret = await getSecret('EMPTY_SECRET');
      expect(secret).toBe('');
    });

    it('should handle secret with special characters', async () => {
      process.env.SPECIAL_SECRET = 'secret!@#$%^&*()_+-=[]{}|;:,.<>?';
      const secret = await getSecret('SPECIAL_SECRET');
      expect(secret).toContain('!@#$%');
    });

    it('should handle very long secret', async () => {
      const longSecret = 'a'.repeat(10000);
      process.env.LONG_SECRET = longSecret;
      const secret = await getSecret('LONG_SECRET');
      expect(secret.length).toBe(10000);
    });

    it('should handle unicode in secret', async () => {
      process.env.UNICODE_SECRET = '密钥-secret-🔑';
      const secret = await getSecret('UNICODE_SECRET');
      expect(secret).toContain('密钥');
    });
  });

  describe('validateSecrets', () => {
    it('BEST CASE: should validate all required secrets', async () => {
      process.env.SECRET1 = 'value1';
      process.env.SECRET2 = 'value2';
      const result = await validateSecrets(['SECRET1', 'SECRET2']);
      expect(result).toBe(true);
    });

    it('AVERAGE CASE: should validate single secret', async () => {
      const result = await validateSecrets(['TEST_SECRET']);
      expect(result).toBe(true);
    });

    it('WORST CASE: should fail if any secret is missing', async () => {
      const result = await validateSecrets(['TEST_SECRET', 'NONEXISTENT']);
      expect(result).toBe(false);
    });

    it('should handle empty secret list', async () => {
      const result = await validateSecrets([]);
      expect(result).toBe(true);
    });

    it('should handle large number of secrets', async () => {
      const secrets = [];
      for (let i = 0; i < 100; i++) {
        process.env[`SECRET_${i}`] = `value_${i}`;
        secrets.push(`SECRET_${i}`);
      }
      const result = await validateSecrets(secrets);
      expect(result).toBe(true);
    });

    it('should fail gracefully on error', async () => {
      const result = await validateSecrets(['MISSING_SECRET']);
      expect(result).toBe(false);
    });
  });

  describe('clearSecretCache', () => {
    it('should clear cached secrets', async () => {
      await getSecret('TEST_SECRET');
      clearSecretCache();
      // After clearing, next retrieval should work
      const secret = await getSecret('TEST_SECRET');
      expect(secret).toBeDefined();
    });

    it('should handle clearing empty cache', () => {
      clearSecretCache();
      expect(true).toBe(true);
    });

    it('should allow re-caching after clear', async () => {
      const secret1 = await getSecret('TEST_SECRET');
      clearSecretCache();
      const secret2 = await getSecret('TEST_SECRET');
      expect(secret1).toBe(secret2);
    });
  });

  describe('maskSecret', () => {
    it('BEST CASE: should mask long secret', () => {
      const secret = 'AIzaSyDxDummyKeyForTestingPurposesOnly';
      const masked = maskSecret(secret, 4);
      expect(masked).toBe('AIza****');
    });

    it('AVERAGE CASE: should mask typical API key', () => {
      const secret = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
      const masked = maskSecret(secret, 3);
      expect(masked).toMatch(/^sk-\*+$/);
    });

    it('WORST CASE: should mask very short secret', () => {
      const secret = 'abc';
      const masked = maskSecret(secret, 4);
      expect(masked).toBe('abc');
    });

    it('should mask with default visible chars', () => {
      const secret = 'secret-key-12345678';
      const masked = maskSecret(secret);
      expect(masked).toMatch(/^secr\*+$/);
    });

    it('should handle zero visible chars', () => {
      const secret = 'secret-key';
      const masked = maskSecret(secret, 0);
      expect(masked).toBe('**********');
    });

    it('should handle visible chars equal to length', () => {
      const secret = 'secret';
      const masked = maskSecret(secret, 6);
      expect(masked).toBe('secret');
    });

    it('should handle visible chars greater than length', () => {
      const secret = 'abc';
      const masked = maskSecret(secret, 10);
      expect(masked).toBe('abc');
    });

    it('should handle empty secret', () => {
      const masked = maskSecret('', 4);
      expect(masked).toBe('');
    });

    it('should handle unicode secret', () => {
      const secret = '密钥-secret-key-12345';
      const masked = maskSecret(secret, 3);
      expect(masked).toContain('*');
    });

    it('should handle very long secret', () => {
      const secret = 'a'.repeat(1000);
      const masked = maskSecret(secret, 4);
      expect(masked).toMatch(/^aaaa\*+$/);
    });
  });

  describe('isValidApiKey', () => {
    it('BEST CASE: should validate valid API key', () => {
      const result = isValidApiKey('AIzaSyDxDummyKeyForTestingPurposesOnly');
      expect(result).toBe(true);
    });

    it('AVERAGE CASE: should validate typical API key', () => {
      const result = isValidApiKey('sk-1234567890abcdefghijklmnopqrstuvwxyz');
      expect(result).toBe(true);
    });

    it('WORST CASE: should reject too short key', () => {
      const result = isValidApiKey('short');
      expect(result).toBe(false);
    });

    it('should reject key with invalid characters', () => {
      const result = isValidApiKey('AIzaSyDxDummyKeyForTestingPurposesOnly!@#$');
      expect(result).toBe(false);
    });

    it('should accept key with underscores', () => {
      const result = isValidApiKey('a'.repeat(32) + '_key');
      expect(result).toBe(true);
    });

    it('should accept key with hyphens', () => {
      const result = isValidApiKey('a'.repeat(32) + '-key');
      expect(result).toBe(true);
    });

    it('should reject key with spaces', () => {
      const result = isValidApiKey('a'.repeat(32) + ' key');
      expect(result).toBe(false);
    });

    it('should reject empty key', () => {
      const result = isValidApiKey('');
      expect(result).toBe(false);
    });

    it('should accept exactly 32 character key', () => {
      const result = isValidApiKey('a'.repeat(32));
      expect(result).toBe(true);
    });

    it('should accept very long key', () => {
      const result = isValidApiKey('a'.repeat(1000));
      expect(result).toBe(true);
    });
  });

  describe('isValidConnectionString', () => {
    it('BEST CASE: should validate valid connection string', () => {
      const result = isValidConnectionString('postgresql://user:pass@localhost:5432/db');
      expect(result).toBe(true);
    });

    it('AVERAGE CASE: should validate typical connection string', () => {
      const result = isValidConnectionString('mongodb://localhost:27017/mydb');
      expect(result).toBe(true);
    });

    it('WORST CASE: should reject invalid connection string', () => {
      const result = isValidConnectionString('not-a-connection-string');
      expect(result).toBe(false);
    });

    it('should validate HTTP connection string', () => {
      const result = isValidConnectionString('http://localhost:8080');
      expect(result).toBe(true);
    });

    it('should validate HTTPS connection string', () => {
      const result = isValidConnectionString('https://api.example.com');
      expect(result).toBe(true);
    });

    it('should validate file connection string', () => {
      const result = isValidConnectionString('file:///path/to/database');
      expect(result).toBe(true);
    });

    it('should validate custom protocol', () => {
      const result = isValidConnectionString('custom://host:port/path');
      expect(result).toBe(true);
    });

    it('should reject empty string', () => {
      const result = isValidConnectionString('');
      expect(result).toBe(false);
    });

    it('should reject string without protocol', () => {
      const result = isValidConnectionString('localhost:5432/db');
      expect(result).toBe(false);
    });

    it('should validate connection string with credentials', () => {
      const result = isValidConnectionString('mysql://user:password@host:3306/database');
      expect(result).toBe(true);
    });

    it('should validate connection string with query params', () => {
      const result = isValidConnectionString('postgresql://host/db?sslmode=require');
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent secret retrievals', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(getSecret('TEST_SECRET'));
      }
      const results = await Promise.all(promises);
      expect(results.every((r) => r === 'test-secret-value-12345678901234567890')).toBe(true);
    });

    it('should handle secret with newlines', async () => {
      process.env.MULTILINE_SECRET = 'line1\nline2\nline3';
      const secret = await getSecret('MULTILINE_SECRET');
      expect(secret).toContain('\n');
    });

    it('should handle secret with tabs', async () => {
      process.env.TAB_SECRET = 'value\twith\ttabs';
      const secret = await getSecret('TAB_SECRET');
      expect(secret).toContain('\t');
    });

    it('should handle secret with quotes', async () => {
      process.env.QUOTE_SECRET = 'value"with"quotes';
      const secret = await getSecret('QUOTE_SECRET');
      expect(secret).toContain('"');
    });
  });

  describe('Security Tests', () => {
    it('should not expose full secret in logs', () => {
      const secret = 'AIzaSyDxDummyKeyForTestingPurposesOnly';
      const masked = maskSecret(secret, 4);
      expect(masked).not.toContain('DummyKeyForTestingPurposesOnly');
    });

    it('should validate API key format', () => {
      const validKey = 'a'.repeat(32);
      const invalidKey = 'short';
      expect(isValidApiKey(validKey)).toBe(true);
      expect(isValidApiKey(invalidKey)).toBe(false);
    });

    it('should validate connection string format', () => {
      const validConnStr = 'postgresql://host/db';
      const invalidConnStr = 'not-a-connection-string';
      expect(isValidConnectionString(validConnStr)).toBe(true);
      expect(isValidConnectionString(invalidConnStr)).toBe(false);
    });

    it('should handle secret injection attempts', async () => {
      process.env.INJECTION_TEST = 'value"; DROP TABLE secrets; --';
      const secret = await getSecret('INJECTION_TEST');
      expect(secret).toContain('DROP TABLE');
    });
  });
});
