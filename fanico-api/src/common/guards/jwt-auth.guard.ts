import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards routes with the passport-jwt strategy. Returns 401 when invalid. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
