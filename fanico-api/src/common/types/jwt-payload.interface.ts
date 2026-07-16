import { Role } from '../../modules/users/entities/user-shop-role.entity';

export interface JwtRoleClaim {
  role: Role;
  shopId: string | null;
}

/** Shape of the signed JWT body. */
export interface JwtPayload {
  sub: string; // userId
  orgId: string;
  roles: JwtRoleClaim[];
}

/** What JwtStrategy.validate() attaches to request.user. */
export interface AuthenticatedUser {
  userId: string;
  orgId: string;
  roles: JwtRoleClaim[];
}
