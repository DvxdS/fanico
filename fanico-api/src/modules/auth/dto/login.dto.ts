import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User phone number (unique within their organization)',
    example: '+2250700000001',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Plaintext password, checked against the stored bcrypt hash',
    example: 'owner-password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
