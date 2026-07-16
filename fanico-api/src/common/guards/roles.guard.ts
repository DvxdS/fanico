import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../modules/users/entities/user-shop-role.entity';
import { AuthenticatedUser } from '../types/jwt-payload.interface';

/**
 * Grants access when the authenticated user holds at least one of the roles
 * declared via @Roles(). Routes without @Roles() are unrestricted (auth still
 * enforced separately by JwtAuthGuard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const heldRoles = user?.roles?.map((r) => r.role) ?? [];

    const hasRole = requiredRoles.some((role) => heldRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
