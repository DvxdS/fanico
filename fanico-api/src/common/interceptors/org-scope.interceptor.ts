import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

/**
 * Extracts orgId from the authenticated user (set by JwtStrategy) and exposes
 * it on the request as `request.orgId` for the @CurrentOrgId() decorator.
 * Registered globally; a no-op on unauthenticated routes (e.g. login).
 */
@Injectable()
export class OrgScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (user?.orgId) {
      request.orgId = user.orgId;
    }
    return next.handle();
  }
}
