# Security Architecture Documentation

## Overview

This document provides a comprehensive overview of the security architecture implemented in the Civiq platform. The system implements defense-in-depth with multiple layers of security controls.

## Table of Contents

1. [Security Layers](#security-layers)
2. [Authentication & Authorization](#authentication--authorization)
3. [Session Management](#session-management)
4. [Input Validation](#input-validation)
5. [Output Encoding](#output-encoding)
6. [PII Protection](#pii-protection)
7. [Threat Detection](#threat-detection)
8. [Audit Logging](#audit-logging)
9. [AI Security](#ai-security)
10. [Infrastructure Security](#infrastructure-security)

## Security Layers

### Layer 1: Network Security
- **HTTPS Enforcement**: All traffic enforced over HTTPS in production
- **CORS Configuration**: Strict origin validation
- **Rate Limiting**: Per-endpoint rate limits to prevent abuse
- **DDoS Protection**: Cloud-level DDoS mitigation via Firebase/GCP

### Layer 2: Authentication
- **Firebase Authentication**: Industry-standard authentication
- **JWT Token Validation**: Cryptographic verification of all tokens
- **Token Expiration**: Short-lived tokens with automatic refresh
- **Multi-Factor Authentication**: Support for MFA via Firebase

### Layer 3: Authorization
- **Role-Based Access Control (RBAC)**: Fine-grained permission system
- **Resource Ownership**: Users can only access their own resources
- **Admin Controls**: Separate admin endpoints with elevated permissions
- **Principle of Least Privilege**: Minimal permissions by default

### Layer 4: Session Security
- **Device Fingerprinting**: Detect session hijacking attempts
- **IP Tracking**: Monitor for suspicious IP changes
- **Session Expiration**: Automatic timeout after inactivity
- **CSRF Protection**: Token-based CSRF prevention

### Layer 5: Input Validation
- **Schema Validation**: Zod schemas for all inputs
- **Type Safety**: TypeScript compile-time checks
- **Length Limits**: Maximum input sizes enforced
- **Character Whitelisting**: Only allowed characters accepted

### Layer 6: Output Encoding
- **JSON Sanitization**: Remove dangerous content from responses
- **Response Header Security**: Prevent response splitting
- **Content-Type Enforcement**: Strict content type headers
- **XSS Prevention**: HTML encoding where needed

### Layer 7: PII Protection
- **Automatic Redaction**: PII detected and redacted from logs
- **GDPR Compliance**: User consent tracking
- **Data Minimization**: Only collect necessary data
- **Anonymization**: Analytics data anonymized

### Layer 8: Threat Detection
- **Anomaly Detection**: Behavioral analysis for suspicious activity
- **Rate Limiting**: Per-user and per-IP limits
- **Threat Scoring**: Risk-based blocking
- **Real-time Monitoring**: Continuous threat assessment

### Layer 9: Audit Logging
- **Comprehensive Logging**: All security events logged
- **Immutable Logs**: BigQuery for tamper-proof storage
- **Log Retention**: 90-day retention policy
- **Compliance**: SOC 2 and GDPR compliant logging

### Layer 10: AI Security
- **Prompt Injection Prevention**: AI firewall with pattern detection
- **Content Filtering**: Harmful content blocked
- **Rate Limiting**: AI endpoint rate limits
- **Output Validation**: AI responses validated before use

## Authentication & Authorization

### Firebase Authentication
```typescript
// Token verification
const decodedToken = await admin.auth().verifyIdToken(token);
const user = await admin.auth().getUser(decodedToken.uid);
```

### RBAC Implementation
```typescript
// Role-based access control
export const requireAdmin = async (req, res, next) => {
  const user = req.user;
  const userRecord = await admin.auth().getUser(user.uid);
  
  if (!userRecord.customClaims?.role === 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};
```

### Resource Ownership
```typescript
// Verify user owns the resource
export const verifyUserOwnership = async (req, res, next) => {
  const { userId } = req.params;
  const authenticatedUser = req.user;
  
  if (userId !== authenticatedUser.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};
```

## Session Management

### Device Fingerprinting
```typescript
// Generate unique device fingerprint
export function generateDeviceFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || req.socket?.remoteAddress || '',
  ];
  
  return crypto.createHash('sha256').update(components.join('|')).digest('hex');
}
```

### Session Validation
- Device fingerprint matching
- User-Agent consistency check
- IP address monitoring
- Session expiration (1 hour TTL)

### CSRF Protection
```typescript
// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate CSRF token
export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
  const storedToken = await redis.get(`csrf:${userId}`);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}
```

## Input Validation

### Zod Schema Validation
```typescript
// Example validation schema
export const ValidationSchemas = {
  verifyClaimRequest: z.object({
    claim: z.string().min(1).max(5000),
  }),
  
  chatRequest: z.object({
    userId: z.string().min(1).max(128),
    message: z.string().min(1).max(10000),
    contextData: z.record(z.unknown()).optional(),
  }),
};
```

### Validation Middleware
- Body validation
- Query parameter validation
- URL parameter validation
- File upload validation

## Output Encoding

### Response Sanitization
```typescript
// Sanitize JSON responses
export function sanitizeJsonResponse(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    const sanitized = sanitizeObject(data);
    return originalJson.call(this, sanitized);
  };
  
  next();
}
```

### Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content-Security-Policy: strict policy
- Strict-Transport-Security: max-age=31536000

## PII Protection

### Automatic Redaction
```typescript
// PII patterns detected and redacted
const PII_PATTERNS = [
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { name: 'phone', pattern: /(?:\+91[\s-]?|0)?[6-9]\d{9}\b/g },
  { name: 'aadhaar', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
  { name: 'pan-card', pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g },
];
```

### GDPR Compliance
- User consent tracking
- Right to erasure
- Data portability
- Privacy by design

## Threat Detection

### Suspicious Activity Detection
```typescript
// Detect multiple IPs in short time window
export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
  const logs = await redis.lrange(`activity:${userId}`, 0, 4);
  const recentLogs = logs.map(l => JSON.parse(l));
  
  const uniqueIps = new Set(recentLogs.map(log => log.ipAddress));
  if (uniqueIps.size > 1) {
    logger.warn({ userId }, 'Suspicious activity detected');
    return true;
  }
  
  return false;
}
```

### Threat Scoring
- Failed login attempts
- Rapid request patterns
- Geographic anomalies
- Known attack patterns

## Audit Logging

### Event Types
- Authentication events (login, logout, token refresh)
- Authorization events (permission checks, role changes)
- Data access events (read, write, delete)
- Admin actions (user management, configuration changes)
- Security events (blocked requests, suspicious activity)

### Log Storage
- **Primary**: BigQuery (immutable, queryable)
- **Secondary**: Cloud Logging (real-time monitoring)
- **Retention**: 90 days minimum

### Log Format
```typescript
interface AuditLog {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
}
```

## AI Security

### AI Firewall
```typescript
// Detect prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|prior)\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
];
```

### Content Filtering
- Harmful content detection
- PII in prompts
- Injection attempts
- Malicious patterns

### Rate Limiting
- 30 requests per minute per user
- 10 verification requests per 15 minutes
- Exponential backoff on failures

## Infrastructure Security

### Docker Security
- Non-root user
- Minimal base image (Alpine)
- Health checks
- Resource limits

### Firebase Security Rules
```javascript
// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Environment Variables
- All secrets in Secret Manager
- No hardcoded credentials
- Environment-specific configs
- Automatic rotation support

## Security Monitoring

### Metrics Tracked
- Failed authentication attempts
- Rate limit violations
- CSRF token failures
- Session hijacking attempts
- Suspicious activity detections
- PII exposure incidents

### Alerting
- Critical: Immediate notification
- High: 15-minute SLA
- Medium: 1-hour SLA
- Low: Daily digest

## Incident Response

### Response Plan
1. **Detection**: Automated monitoring and alerting
2. **Containment**: Automatic blocking of threats
3. **Investigation**: Log analysis and forensics
4. **Remediation**: Patch vulnerabilities
5. **Recovery**: Restore normal operations
6. **Post-Mortem**: Document lessons learned

### Contact Information
- Security Team: security@civiq.app
- Emergency: +1-XXX-XXX-XXXX
- Bug Bounty: https://civiq.app/security

## Compliance

### Standards
- **GDPR**: EU data protection regulation
- **CCPA**: California privacy law
- **SOC 2**: Security and availability
- **ISO 27001**: Information security management

### Certifications
- Firebase: ISO 27001, SOC 2, SOC 3
- Google Cloud: ISO 27001, SOC 2, PCI DSS
- BigQuery: HIPAA, FedRAMP

## Security Testing

### Automated Testing
- Unit tests for security functions
- Integration tests for auth flows
- Property-based testing for validation
- Fuzzing for input handling

### Manual Testing
- Penetration testing (quarterly)
- Security code reviews
- Threat modeling sessions
- Red team exercises

## Security Updates

### Dependency Management
- Automated vulnerability scanning
- Weekly dependency updates
- Security patch priority
- Breaking change assessment

### Version Control
- Signed commits required
- Branch protection rules
- Code review mandatory
- CI/CD security gates

## Best Practices

### Development
1. Never commit secrets
2. Use environment variables
3. Validate all inputs
4. Sanitize all outputs
5. Log security events
6. Follow least privilege
7. Keep dependencies updated
8. Write security tests

### Deployment
1. Use HTTPS everywhere
2. Enable security headers
3. Configure CORS properly
4. Set up monitoring
5. Enable audit logging
6. Use secrets management
7. Implement rate limiting
8. Test security controls

### Operations
1. Monitor security metrics
2. Review audit logs
3. Respond to incidents
4. Update dependencies
5. Rotate secrets regularly
6. Backup data securely
7. Test disaster recovery
8. Train team on security

## Resources

### Documentation
- [Firebase Security](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### Tools
- ESLint security plugins
- npm audit
- Snyk
- TruffleHog
- CodeQL

### Training
- OWASP Security Training
- Google Cloud Security
- Firebase Security Best Practices

---

**Last Updated**: May 3, 2026
**Version**: 1.0.0
**Owner**: Security Team
