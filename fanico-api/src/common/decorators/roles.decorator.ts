import { SetMetadata } from '@nestjs/common';
import { Role } from '../../modules/users/entities/user-shop-role.entity';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to users holding at least one of the given roles.
 * Read by RolesGuard against the JWT roles claim.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
