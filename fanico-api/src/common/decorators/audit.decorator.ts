import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../modules/audit/entities/audit-log.entity';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  entityType: string;
  action: AuditAction;
}

/**
 * Marks a mutating endpoint for automatic audit-logging by AuditLogInterceptor.
 * e.g. @Audit('ticket', AuditAction.TRANSITION)
 */
export const Audit = (entityType: string, action: AuditAction) =>
  SetMetadata(AUDIT_KEY, { entityType, action } satisfies AuditMeta);
