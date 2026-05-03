# Code Quality Standards

## Overview

This document defines the code quality standards for the Civiq platform. All code must meet these standards before being merged to the main branch.

## Table of Contents

1. [Code Quality Metrics](#code-quality-metrics)
2. [Testing Standards](#testing-standards)
3. [Code Style](#code-style)
4. [Documentation](#documentation)
5. [Performance](#performance)
6. [Security](#security)
7. [Review Process](#review-process)

## Code Quality Metrics

### Test Coverage Requirements

**Minimum Coverage Thresholds:**
- **Lines**: 95%
- **Functions**: 95%
- **Branches**: 90%
- **Statements**: 95%

**Critical Modules (100% Required):**
- Security middleware
- Authentication/Authorization
- Input validation
- Output encoding
- PII redaction
- Audit logging

### Code Complexity

**Maximum Complexity:**
- **Cyclomatic Complexity**: 10 per function
- **Cognitive Complexity**: 15 per function
- **File Length**: 500 lines
- **Function Length**: 50 lines

### Type Safety

**TypeScript Requirements:**
- **Strict Mode**: Enabled
- **No Explicit Any**: Avoid `any` types
- **No Implicit Any**: All parameters typed
- **Strict Null Checks**: Enabled
- **No Unused Variables**: Zero tolerance

## Testing Standards

### Test Types

#### Unit Tests
```typescript
describe('sanitizeInput', () => {
  it('should escape special characters', () => {
    const input = 'Hello "world"';
    const result = sanitizeInput(input);
    expect(result).toContain('\\"');
  });
  
  it('should handle null input', () => {
    expect(sanitizeInput(null)).toBe('');
  });
  
  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
```

#### Integration Tests
```typescript
describe('POST /api/v1/verify', () => {
  it('should verify claim with valid token', async () => {
    const response = await request(app)
      .post('/api/v1/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ claim: 'Test claim' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('result');
  });
});
```

#### Property-Based Tests
```typescript
describe('sanitizeInput (Property-Based)', () => {
  it('should always return a string', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = sanitizeInput(text);
        return typeof result === 'string';
      })
    );
  });
});
```

### Test Organization

**File Structure:**
```
src/
  utils/
    sanitize.ts
  __tests__/
    utils/
      sanitize.test.ts
      sanitize.edge-cases.test.ts
```

**Test Naming:**
- Descriptive test names
- Use "should" statements
- Include edge cases
- Test error paths

### Test Quality

**Requirements:**
- Test both success and failure paths
- Test edge cases (null, undefined, empty)
- Test boundary conditions
- Test error handling
- Mock external dependencies
- Use meaningful assertions

## Code Style

### ESLint Configuration

**Rules:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended"
  ],
  "rules": {
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "security/detect-object-injection": "error"
  }
}
```

### Prettier Configuration

**Format:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Naming Conventions

**Variables:**
```typescript
// camelCase for variables and functions
const userName = 'John';
function getUserData() {}

// PascalCase for classes and types
class UserService {}
interface UserData {}

// UPPER_CASE for constants
const MAX_RETRIES = 3;
const API_ENDPOINT = 'https://api.example.com';
```

**Files:**
```
// kebab-case for files
user-service.ts
auth-middleware.ts

// PascalCase for React components
UserProfile.tsx
LoginForm.tsx
```

### Code Organization

**Import Order:**
```typescript
// 1. External dependencies
import express from 'express';
import { z } from 'zod';

// 2. Internal modules
import { UserService } from './services/user.service.js';
import { logger } from './utils/logger.js';

// 3. Types
import type { User, UserRole } from './types/user.js';
```

**Function Organization:**
```typescript
// 1. Type definitions
interface UserData {
  id: string;
  name: string;
}

// 2. Constants
const MAX_NAME_LENGTH = 100;

// 3. Helper functions
function validateName(name: string): boolean {
  return name.length <= MAX_NAME_LENGTH;
}

// 4. Main functions
export function createUser(data: UserData): User {
  if (!validateName(data.name)) {
    throw new Error('Invalid name');
  }
  // ...
}
```

## Documentation

### Code Comments

**When to Comment:**
- Complex algorithms
- Non-obvious business logic
- Security considerations
- Performance optimizations
- Workarounds for bugs

**When NOT to Comment:**
- Obvious code
- Self-explanatory functions
- Redundant information

**Good Comments:**
```typescript
/**
 * Validate session fingerprint to detect hijacking attempts.
 * Compares device fingerprint, User-Agent, and IP address.
 * 
 * @param req - Express request object
 * @param userId - User ID to validate
 * @param currentFingerprint - Current device fingerprint
 * @returns true if session is valid, false otherwise
 */
export async function validateSessionFingerprint(
  req: Request,
  userId: string,
  currentFingerprint: string
): Promise<boolean> {
  // Implementation
}
```

### JSDoc Standards

**Required for:**
- All exported functions
- All public methods
- Complex internal functions

**Format:**
```typescript
/**
 * Brief description of what the function does.
 * 
 * Longer description if needed, explaining:
 * - Why this function exists
 * - Important implementation details
 * - Security considerations
 * 
 * @param paramName - Description of parameter
 * @param optionalParam - Description (optional)
 * @returns Description of return value
 * @throws {ErrorType} Description of when error is thrown
 * 
 * @example
 * ```typescript
 * const result = myFunction('input');
 * console.log(result); // 'output'
 * ```
 */
```

### README Standards

**Required Sections:**
- Overview
- Installation
- Configuration
- Usage
- API Documentation
- Testing
- Deployment
- Contributing
- License

## Performance

### Performance Budgets

**API Response Times:**
- **P50**: < 100ms
- **P95**: < 500ms
- **P99**: < 1000ms

**Database Queries:**
- **Simple Queries**: < 50ms
- **Complex Queries**: < 200ms
- **Aggregations**: < 500ms

### Optimization Guidelines

**Database:**
- Use indexes for frequent queries
- Batch operations when possible
- Cache frequently accessed data
- Use connection pooling

**API:**
- Implement pagination
- Use compression
- Cache responses
- Minimize payload size

**Code:**
- Avoid N+1 queries
- Use async/await properly
- Minimize synchronous operations
- Profile before optimizing

## Security

### Security Checklist

**Input Validation:**
- [ ] All inputs validated with Zod schemas
- [ ] Length limits enforced
- [ ] Type checking enabled
- [ ] Special characters handled

**Output Encoding:**
- [ ] JSON responses sanitized
- [ ] HTML encoded where needed
- [ ] Security headers set
- [ ] Content-Type enforced

**Authentication:**
- [ ] Tokens validated
- [ ] Expiration checked
- [ ] Permissions verified
- [ ] Session secured

**Data Protection:**
- [ ] PII redacted from logs
- [ ] Sensitive data encrypted
- [ ] Secrets in environment variables
- [ ] No hardcoded credentials

### Security Review

**Required for:**
- Authentication changes
- Authorization changes
- Input validation changes
- Cryptographic operations
- External API integrations

## Review Process

### Pull Request Requirements

**Before Creating PR:**
- [ ] All tests passing
- [ ] Coverage thresholds met
- [ ] Linting passing
- [ ] Type checking passing
- [ ] No console statements
- [ ] Documentation updated

**PR Description:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Security
- [ ] Security implications reviewed
- [ ] No secrets committed
- [ ] Input validation added
- [ ] Audit logging added

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Code Review Guidelines

**Reviewers Should Check:**
1. **Correctness**: Does the code work as intended?
2. **Security**: Are there security vulnerabilities?
3. **Performance**: Are there performance issues?
4. **Maintainability**: Is the code easy to understand?
5. **Testing**: Are tests comprehensive?
6. **Documentation**: Is documentation adequate?

**Review Checklist:**
- [ ] Code is readable and maintainable
- [ ] Tests are comprehensive
- [ ] Security best practices followed
- [ ] Performance considerations addressed
- [ ] Documentation is clear
- [ ] No code smells
- [ ] Error handling is robust

### Merge Requirements

**Automated Checks:**
- ✅ All tests passing
- ✅ Coverage thresholds met
- ✅ Linting passing
- ✅ Type checking passing
- ✅ Security scan passing
- ✅ Build successful

**Manual Checks:**
- ✅ At least 1 approval
- ✅ All comments resolved
- ✅ Documentation updated
- ✅ Changelog updated

## Continuous Improvement

### Metrics Tracking

**Weekly:**
- Test coverage trends
- Code quality scores
- Build times
- Deployment frequency

**Monthly:**
- Technical debt assessment
- Performance benchmarks
- Security audit results
- Code review metrics

### Quality Goals

**Q2 2026:**
- 95% test coverage
- Zero critical security issues
- < 100ms P95 response time
- < 5% failed deployments

**Q3 2026:**
- 98% test coverage
- Zero high security issues
- < 50ms P95 response time
- < 2% failed deployments

## Tools

### Required Tools

**Development:**
- ESLint
- Prettier
- TypeScript
- Vitest

**Security:**
- npm audit
- Snyk
- TruffleHog
- CodeQL

**Quality:**
- SonarQube
- Code Climate
- Codecov

### Recommended Tools

**IDE Extensions:**
- ESLint
- Prettier
- GitLens
- Error Lens

**CLI Tools:**
- husky (git hooks)
- lint-staged
- commitlint

## Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Vitest Documentation](https://vitest.dev/)

### Training
- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- The Pragmatic Programmer

---

**Last Updated**: May 3, 2026
**Version**: 1.0.0
**Owner**: Engineering Team
