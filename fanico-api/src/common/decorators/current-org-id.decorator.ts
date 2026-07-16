import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Injects the authenticated user's orgId (placed on the request by
 * OrgScopeInterceptor). Every service method that queries the DB must accept
 * and apply this to enforce org-scoped tenancy (ground rule #2).
 */
export const CurrentOrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const orgId: string | undefined = request.orgId;
    if (!orgId) {
      // Reaching here means the route was not behind JwtAuthGuard — a bug.
      throw new InternalServerErrorException(
        'orgId missing from request context',
      );
    }
    return orgId;
  },
);
