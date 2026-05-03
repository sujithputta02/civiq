/* eslint-disable @typescript-eslint/naming-convention */
import { adminDb } from '../identity/admin.service.js';
import logger from '../../utils/logger.js';

/**
 * Audit Logging Service
 * Logs all sensitive operations for compliance and security monitoring
 */

export interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  method: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  statusCode?: number;
  reason?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp?: string;
}

/**
 * Log audit event to Firestore
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const auditEntry = {
      ...event,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };

    // Store in Firestore audit collection
    await adminDb.collection('audit_logs').add(auditEntry);

    logger.info(
      {
        action: event.action,
        userId: event.userId,
        resource: event.resource,
        status: event.status,
      },
      'Audit event logged'
    );
  } catch (error) {
    logger.error(error, 'Failed to log audit event');
    // Don't throw - audit logging should not break the application
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string,
  eventType: 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH' | 'AUTH_FAILED',
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  return logAuditEvent({
    userId,
    action: eventType,
    resource: '/auth',
    method: 'POST',
    status: eventType === 'AUTH_FAILED' ? 'FAILED' : 'SUCCESS',
    ipAddress,
    userAgent,
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  userId: string,
  action: string,
  resource: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const auditEntry = {
      userId,
      action: `ADMIN_${action}`,
      resource,
      method: 'ADMIN',
      status: 'SUCCESS' as const,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
      details,
    };

    await adminDb.collection('audit_logs').add(auditEntry);

    logger.info({ userId, action, resource }, 'Admin action logged');
  } catch (error) {
    logger.error(error, 'Failed to log admin action');
  }
}

/**
 * Log security event (suspicious activity, attacks, etc.)
 */
export async function logSecurityEvent(
  eventType: string,
  userId: string,
  details: Record<string, unknown>,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): Promise<void> {
  try {
    const securityEntry = {
      userId,
      eventType,
      severity,
      details,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };

    await adminDb.collection('security_events').add(securityEntry);

    logger.warn({ userId, eventType, severity }, 'Security event logged');
  } catch (error) {
    logger.error(error, 'Failed to log security event');
  }
}

/**
 * Retrieve audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditEvent[]> {
  try {
    const snapshot = await adminDb
      .collection('audit_logs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AuditEvent);
  } catch (error) {
    logger.error(error, 'Failed to retrieve user audit logs');
    return [];
  }
}

/**
 * Retrieve all audit logs (admin only)
 */
export async function getAllAuditLogs(limit: number = 1000): Promise<AuditEvent[]> {
  try {
    const snapshot = await adminDb
      .collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AuditEvent);
  } catch (error) {
    logger.error(error, 'Failed to retrieve all audit logs');
    return [];
  }
}

/**
 * Retrieve security events (admin only)
 */
export async function getSecurityEvents(
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  limit: number = 100
): Promise<Record<string, unknown>[]> {
  try {
    let query = adminDb.collection('security_events').orderBy('timestamp', 'desc');

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    const snapshot = await query.limit(limit).get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    logger.error(error, 'Failed to retrieve security events');
    return [];
  }
}
