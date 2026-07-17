import { Role } from '../../modules/users/entities/user-shop-role.entity';

/**
 * Reusable role groupings for @Roles(). Sensible defaults (the full TDR §7
 * permission matrix was unavailable); tighten per-shop enforcement later.
 */
export const MANAGERS = [Role.OWNER, Role.SHOP_MANAGER] as const;
export const FRONT_DESK = [Role.OWNER, Role.SHOP_MANAGER, Role.CASHIER] as const;
export const PRODUCTION = [Role.OWNER, Role.SHOP_MANAGER, Role.OPERATOR] as const;
export const REPORT_VIEWERS = [Role.OWNER, Role.SHOP_MANAGER, Role.AUDITOR] as const;
export const ALL_STAFF = [
  Role.OWNER,
  Role.SHOP_MANAGER,
  Role.CASHIER,
  Role.OPERATOR,
  Role.AUDITOR,
] as const;

/** Ordered most-privileged first — used to pick a single "actorRole" for audit. */
export const ROLE_PRIORITY: Role[] = [
  Role.OWNER,
  Role.SHOP_MANAGER,
  Role.AUDITOR,
  Role.CASHIER,
  Role.OPERATOR,
];
