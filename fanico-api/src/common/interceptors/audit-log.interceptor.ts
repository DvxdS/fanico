import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { concatMap, Observable } from 'rxjs';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { ROLE_PRIORITY } from '../constants/role-groups';
import { AuditService } from '../../modules/audit/audit.service';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

/**
 * Writes an AuditLog row for endpoints marked with @Audit(). Runs only on
 * successful responses; failures to write are swallowed (logged) so auditing
 * never breaks the request.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMeta | undefined>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      return next.handle();
    }

    // Await the audit write before returning the response so the trail is
    // durable by the time the client (or a follow-up read) sees success.
    return next.handle().pipe(
      concatMap(async (response) => {
        try {
          await this.write(meta, request, user, response);
        } catch (err) {
          this.logger.warn(
            `Failed to write audit log: ${(err as Error).message}`,
          );
        }
        return response;
      }),
    );
  }

  private async write(
    meta: AuditMeta,
    request: {
      orgId?: string;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
      ip?: string;
    },
    user: AuthenticatedUser,
    response: unknown,
  ): Promise<void> {
    const res = (response ?? {}) as Record<string, unknown>;
    const orgId = request.orgId ?? user.orgId;
    const entityId =
      (typeof res.id === 'string' ? res.id : undefined) ??
      request.params?.id ??
      null;
    const shopId =
      (request.body?.shopId as string | undefined) ??
      (typeof res.shopId === 'string' ? res.shopId : undefined) ??
      request.params?.shopId ??
      null;

    await this.auditService.record({
      orgId,
      actorUserId: user.userId,
      actorRole: this.primaryRole(user),
      shopId,
      entityType: meta.entityType,
      entityId,
      action: meta.action,
      after: this.shallow(response),
      reason: (request.body?.reason as string | undefined) ?? null,
      ip: request.ip ?? null,
    });
  }

  private primaryRole(user: AuthenticatedUser): string {
    const held = new Set((user.roles ?? []).map((r) => r.role));
    for (const role of ROLE_PRIORITY) {
      if (held.has(role)) return role;
    }
    return 'UNKNOWN';
  }

  /** Keep only top-level scalar fields — avoids storing nested arrays/bloat. */
  private shallow(obj: unknown): Record<string, unknown> | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        out[key] = value;
      }
    }
    return out;
  }
}
