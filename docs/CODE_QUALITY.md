# Code Quality Standards & Checklist

## Overview

This document outlines the code quality standards for the Civiq project and provides a checklist for developers to ensure compliance.

---

## TypeScript Standards

### Configuration

- ✅ `strict: true` - Strict type checking enabled
- ✅ `noImplicitAny: true` - No implicit any types
- ✅ `noUnusedLocals: true` - Unused variables flagged
- ✅ `noUnusedParameters: true` - Unused parameters flagged
- ✅ `noImplicitReturns: true` - All code paths must return
- ✅ `noFallthroughCasesInSwitch: true` - Switch cases must have break/return
- ✅ `resolveJsonModule: true` - Can import JSON files
- ✅ `esModuleInterop: true` - CommonJS/ES module interop
- ✅ `skipLibCheck: true` - Skip type checking of declaration files
- ✅ `forceConsistentCasingInFileNames: true` - Consistent file naming

### Best Practices

- ✅ Use explicit return types on functions
- ✅ Use interfaces for object shapes
- ✅ Use enums for fixed sets of values
- ✅ Use generics for reusable components
- ✅ Avoid `any` type (use `unknown` if necessary)
- ✅ Use `const` by default, `let` if needed, never `var`
- ✅ Use arrow functions for callbacks
- ✅ Use template literals for string interpolation

---

## ESLint Standards

### Configuration

- ✅ Shared ESLint config in `packages/config/eslint/`
- ✅ TypeScript ESLint plugin enabled
- ✅ React ESLint plugin enabled (frontend)
- ✅ Naming conventions enforced
- ✅ No console logs in production code

### Rules

- ✅ `no-console`: Warn (allow warn/error)
- ✅ `no-var`: Error
- ✅ `prefer-const`: Error
- ✅ `prefer-arrow-callback`: Error
- ✅ `eqeqeq`: Error (always use ===)
- ✅ `@typescript-eslint/no-explicit-any`: Error
- ✅ `@typescript-eslint/explicit-function-return-types`: Error
- ✅ `@typescript-eslint/no-unused-vars`: Error

---

## Prettier Standards

### Configuration

- ✅ Semi-colons: Always
- ✅ Trailing commas: ES5
- ✅ Single quotes: Yes
- ✅ Print width: 100 characters
- ✅ Tab width: 2 spaces
- ✅ Line endings: LF

### Usage

- ✅ Format on save (IDE configured)
- ✅ Pre-commit hook runs Prettier
- ✅ CI/CD checks formatting

---

## Testing Standards

### Framework

- ✅ Vitest for unit tests
- ✅ Test files in `__tests__/` directory
- ✅ File naming: `*.test.ts` or `*.spec.ts`

### Coverage Requirements

- ✅ Minimum 80% line coverage
- ✅ Minimum 80% function coverage
- ✅ Minimum 80% branch coverage
- ✅ Minimum 80% statement coverage

### Test Structure

```typescript
describe('Feature', () => {
  describe('Function', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### What to Test

- ✅ Happy path scenarios
- ✅ Error cases
- ✅ Edge cases
- ✅ Input validation
- ✅ Security-critical functions

---

## Code Organization

### Folder Structure

**Backend**:

```
apps/api/src/
├── __tests__/          # Unit tests
├── controllers/        # Request handlers
├── middleware/         # Auth, validation, security
├── services/           # Business logic
├── utils/              # Utilities and helpers
└── index.ts            # Entry point
```

**Frontend**:

```
apps/web/src/
├── app/                # Pages and layouts
├── components/         # React components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── lib/                # Utilities
└── store/              # State management
```

### Naming Conventions

- ✅ Files: `camelCase.ts` or `PascalCase.tsx`
- ✅ Variables: `camelCase`
- ✅ Constants: `UPPER_CASE`
- ✅ Types/Interfaces: `PascalCase`
- ✅ Enums: `PascalCase`
- ✅ Functions: `camelCase`
- ✅ Classes: `PascalCase`

---

## Documentation Standards

### Code Comments

- ✅ JSDoc for public functions
- ✅ Explain "why", not "what"
- ✅ Keep comments up-to-date
- ✅ Use `TODO` for future work

### Example

```typescript
/**
 * Sanitize user input to prevent prompt injection attacks
 * @param input - The user input string
 * @returns Sanitized string with escaped special characters
 */
export function sanitizeInput(input: string): string {
  // Implementation
}
```

### README Files

- ✅ Project overview
- ✅ Setup instructions
- ✅ Development workflow
- ✅ Deployment instructions
- ✅ Contributing guidelines

---

## Security Standards

### Input Validation

- ✅ Use Zod schemas for all API inputs
- ✅ Validate on both frontend and backend
- ✅ Sanitize user input before using in prompts
- ✅ Escape HTML content

### Authentication

- ✅ Verify Firebase ID tokens on all protected endpoints
- ✅ Validate session fingerprints
- ✅ Implement rate limiting
- ✅ Use HTTPS in production

### Data Protection

- ✅ Never hardcode secrets
- ✅ Use environment variables
- ✅ Encrypt sensitive data at rest
- ✅ Implement audit logging

---

## Performance Standards

### Frontend

- ✅ Code splitting for routes
- ✅ Image optimization
- ✅ Lazy loading for components
- ✅ Memoization for expensive computations

### Backend

- ✅ Database query optimization
- ✅ Caching strategies
- ✅ Connection pooling
- ✅ Async/await for I/O operations

---

## Git Standards

### Commit Messages

- ✅ Use conventional commits
- ✅ Format: `type(scope): description`
- ✅ Types: feat, fix, docs, style, refactor, test, chore
- ✅ Keep messages concise

### Example

```
feat(auth): add session hijacking protection
fix(api): sanitize user input in verify endpoint
docs(architecture): add deployment guide
```

### Branch Naming

- ✅ Feature: `feature/description`
- ✅ Bug fix: `fix/description`
- ✅ Documentation: `docs/description`
- ✅ Refactor: `refactor/description`

---

## Pre-commit Hooks

### Husky

- ✅ Pre-commit: Run lint-staged
- ✅ Pre-push: Run typecheck and lint

### Lint-staged

- ✅ Format TypeScript files
- ✅ Lint TypeScript files
- ✅ Format JSON/Markdown files

---

## CI/CD Standards

### Quality Checks

- ✅ Type checking: `npm run typecheck`
- ✅ Linting: `npm run lint`
- ✅ Format check: `prettier --check`
- ✅ Tests: `npm run test:run`
- ✅ Coverage: Minimum 80%

### Build Verification

- ✅ Successful build
- ✅ No build warnings
- ✅ All tests passing

### Security Audit

- ✅ npm audit for vulnerabilities
- ✅ Dependency updates
- ✅ License compliance

---

## Developer Checklist

Before committing code:

- [ ] Code compiles without errors
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatting applied (`npm run format`)
- [ ] Tests pass (`npm run test:run`)
- [ ] Test coverage >= 80%
- [ ] No console.log statements (except in services)
- [ ] No hardcoded secrets
- [ ] Comments explain "why", not "what"
- [ ] Commit message follows conventions
- [ ] PR description is clear and complete

---

## Code Review Checklist

When reviewing code:

- [ ] Code follows TypeScript standards
- [ ] Code follows ESLint rules
- [ ] Code is properly formatted
- [ ] Tests are included and passing
- [ ] Security best practices followed
- [ ] No hardcoded secrets
- [ ] Comments are clear and helpful
- [ ] Performance is acceptable
- [ ] Error handling is appropriate
- [ ] Documentation is updated

---

## Continuous Improvement

### Metrics to Track

- Code coverage percentage
- ESLint violations
- TypeScript errors
- Test pass rate
- Build time
- Deployment frequency

### Regular Reviews

- Weekly: Code quality metrics
- Monthly: Architecture review
- Quarterly: Dependency updates
- Annually: Security audit

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Vitest Documentation](https://vitest.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
