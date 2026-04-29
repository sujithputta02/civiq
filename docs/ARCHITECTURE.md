# Civiq Architecture

## Overview

Civiq is a full-stack monorepo application for election information verification and voter guidance. It uses a modern, scalable architecture with clear separation of concerns.

---

## Project Structure

```
civiq/
├── apps/
│   ├── api/                    # Express.js backend
│   │   ├── src/
│   │   │   ├── __tests__/      # Unit tests
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── middleware/     # Auth, security, validation
│   │   │   ├── services/       # Business logic
│   │   │   ├── utils/          # Utilities (sanitization, etc.)
│   │   │   └── index.ts        # Entry point
│   │   ├── vitest.config.ts    # Test configuration
│   │   └── tsconfig.json       # TypeScript configuration
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # Pages and layouts
│       │   ├── components/     # React components
│       │   ├── contexts/       # React contexts
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # Utilities and libraries
│       │   └── store/          # State management (Zustand)
│       └── tsconfig.json       # TypeScript configuration
│
├── packages/
│   ├── config/                 # Shared configurations
│   │   ├── eslint/             # ESLint configs
│   │   └── typescript/         # TypeScript configs
│   ├── types/                  # Shared types and schemas
│   └── ui/                     # Shared UI components
│
├── docs/                       # Documentation
├── .github/workflows/          # CI/CD pipelines
├── .husky/                     # Git hooks
├── .prettierrc                 # Prettier configuration
├── .lintstagedrc.json          # Lint-staged configuration
└── package.json                # Root package configuration
```

---

## Technology Stack

### Backend (apps/api)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Firestore (Google Cloud)
- **Authentication**: Firebase Auth
- **AI/ML**: Gemini 2.0 Flash, OpenRouter (fallback)
- **Search**: Tavily API
- **Analytics**: BigQuery
- **Messaging**: Cloud Pub/Sub, Firebase Cloud Messaging
- **Testing**: Vitest
- **Linting**: ESLint
- **Formatting**: Prettier

### Frontend (apps/web)

- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI Library**: React 18
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Data Fetching**: TanStack Query
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast
- **Linting**: ESLint (Next.js config)

### Shared (packages)

- **Type Safety**: Zod (schema validation)
- **Configuration**: Shared ESLint and TypeScript configs

---

## Architecture Patterns

### Backend Architecture

```
Request → Middleware (Auth, Security, Rate Limit)
       → Route Handler
       → Service Layer (Business Logic)
       → Database Layer (Firestore)
       → Response
```

**Layers**:

1. **Middleware**: Authentication, authorization, rate limiting, security
2. **Routes**: HTTP endpoint definitions
3. **Services**: Business logic (Gemini, Tavily, Firestore operations)
4. **Database**: Firestore collections and queries
5. **Utils**: Sanitization, validation, helpers

### Frontend Architecture

```
Page Component
├── Hooks (useAuth, useNotifications)
├── Context (AuthContext)
├── Store (Zustand)
├── Components (UI, Forms)
└── API Calls (TanStack Query)
```

**Patterns**:

1. **Feature-based Structure**: Pages organized by feature (dashboard, assessment, etc.)
2. **Context API**: Global state (authentication)
3. **Zustand Store**: Assessment data management
4. **Custom Hooks**: Reusable logic (useNotifications)
5. **Component Composition**: Reusable UI components

---

## Data Flow

### Authentication Flow

```
User Login
  ↓
Firebase Auth (Email/Google)
  ↓
Firebase ID Token Generated
  ↓
Token Stored in Frontend
  ↓
Token Sent in Authorization Header
  ↓
Backend Verifies Token
  ↓
Session Fingerprint Validated
  ↓
Request Processed
```

### Claim Verification Flow

```
User Submits Claim
  ↓
Frontend Validates Input
  ↓
API Request with Auth Token
  ↓
Backend Rate Limit Check
  ↓
Input Sanitization
  ↓
Tavily Web Search
  ↓
Gemini AI Analysis
  ↓
Result Logged to BigQuery
  ↓
Result Published to Pub/Sub
  ↓
Response Sent to Frontend
  ↓
Worker Processes Pub/Sub Message
  ↓
Aggregates Updated in Firestore
```

---

## Security Architecture

### Authentication & Authorization

- **Firebase Auth**: Handles user authentication
- **ID Token Verification**: All protected endpoints verify tokens
- **Session Fingerprinting**: Device consistency validation
- **Suspicious Activity Detection**: Monitors for account takeover

### Input Validation & Sanitization

- **Zod Schemas**: Type-safe input validation
- **Input Sanitization**: Escapes special characters
- **HTML Sanitization**: Removes XSS vectors
- **Location Sanitization**: Prevents injection attacks

### Rate Limiting

- **Per-Endpoint Limits**: Different limits for different endpoints
- **Time Windows**: 15 minutes for verify, 1 minute for chat
- **User-Based**: Limits applied per authenticated user

### Data Protection

- **HTTPS**: Enforced in production
- **CORS**: Restricted to known origins
- **CSP Headers**: Content Security Policy
- **Security Headers**: Helmet.js middleware

---

## Deployment Architecture

### Backend (Cloud Run)

```
GitHub Push
  ↓
GitHub Actions (CI/CD)
  ↓
Build Docker Image
  ↓
Push to Container Registry
  ↓
Deploy to Cloud Run
  ↓
Environment Variables Injected
  ↓
Service Account Credentials
  ↓
Firestore Access
  ↓
Pub/Sub Access
```

### Frontend (Vercel)

```
GitHub Push
  ↓
Vercel Deployment
  ↓
Build Next.js App
  ↓
Deploy to CDN
  ↓
Environment Variables Injected
  ↓
Firebase Config
```

---

## Code Quality Standards

### TypeScript

- **Strict Mode**: Enabled
- **No Implicit Any**: Enforced
- **Unused Variables**: Flagged
- **Path Aliases**: `@/*` for imports

### ESLint

- **Shared Config**: `packages/config/eslint/`
- **TypeScript Rules**: Strict type checking
- **React Rules**: Hooks and best practices
- **Naming Conventions**: camelCase for variables, PascalCase for types

### Prettier

- **Formatting**: Consistent code style
- **Line Width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: Always

### Testing

- **Framework**: Vitest
- **Coverage**: 80% minimum
- **Unit Tests**: Critical paths (auth, services)
- **Integration Tests**: API endpoints

### CI/CD

- **Quality Checks**: Lint, typecheck, format
- **Security Audit**: npm audit
- **Build Verification**: Successful build
- **Test Coverage**: Minimum 80%

---

## Scalability Considerations

### Current Limitations

- Session store is in-memory (use Redis for production)
- Activity logs are in-memory (use database for production)
- No caching layer (consider Redis)
- No database indexing strategy documented

### Future Improvements

1. **Caching**: Redis for session and activity data
2. **Database Optimization**: Firestore indexes and query optimization
3. **Load Balancing**: Multiple Cloud Run instances
4. **CDN**: CloudFlare or similar for static assets
5. **Monitoring**: Cloud Monitoring and Logging
6. **Alerting**: PagerDuty or similar for incidents

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run linting
npm run lint

# Run tests
npm run test

# Type checking
npm run typecheck

# Format code
npm run format
```

### Pre-commit Hooks

- Husky: Git hooks management
- Lint-staged: Run linters on staged files
- Automatic formatting and linting

### CI/CD Pipeline

- **Quality**: Lint, typecheck, format check
- **Security**: npm audit
- **Tests**: Unit tests with coverage
- **Build**: Verify successful build

---

## Monitoring & Logging

### Backend Logging

- Console logs for development
- Cloud Logging for production
- Structured logging for errors
- Audit logs for security events

### Frontend Monitoring

- Firebase Analytics
- Firebase Performance Monitoring
- Error tracking (Sentry recommended)

---

## References

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Firebase Security](https://firebase.google.com/docs/security)
- [Next.js Best Practices](https://nextjs.org/docs/basic-features/best-practices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
