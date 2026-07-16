import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../users/entities/user-shop-role.entity';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Signed JWT — pass as Bearer token to protected endpoints',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}

export class RoleClaimDto {
  @ApiProperty({ enum: Role, example: Role.OWNER })
  role: Role;

  @ApiProperty({
    description: 'Shop the role applies to; null means org-wide',
    example: null,
    nullable: true,
  })
  shopId: string | null;
}

export class MeResponseDto {
  @ApiProperty({ description: 'User id (uuid)', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Organization id (uuid)', format: 'uuid' })
  orgId: string;

  @ApiProperty({ example: 'Awa Diallo' })
  fullName: string;

  @ApiProperty({ example: '+2250700000001' })
  phone: string;

  @ApiProperty({ example: 'owner@fanico.test', nullable: true })
  email: string | null;

  @ApiProperty({ type: [RoleClaimDto] })
  roles: RoleClaimDto[];
}
