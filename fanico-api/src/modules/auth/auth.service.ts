import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  JwtPayload,
  JwtRoleClaim,
} from '../../common/types/jwt-payload.interface';
import { LoginResponseDto, MeResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** Validate phone + password, return a signed JWT. */
  async login(phone: string, password: string): Promise<LoginResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { phone },
      relations: { roles: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles: JwtRoleClaim[] = (user.roles ?? []).map((r) => ({
      role: r.role,
      shopId: r.shopId,
    }));

    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.orgId,
      roles,
    };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }

  /** Current user + roles for GET /me. */
  async getMe(userId: string, orgId: string): Promise<MeResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, orgId },
      relations: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      id: user.id,
      orgId: user.orgId,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      roles: (user.roles ?? []).map((r) => ({
        role: r.role,
        shopId: r.shopId,
      })),
    };
  }
}
