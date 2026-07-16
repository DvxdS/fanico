import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.interface';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in with phone + password, receive a JWT' })
  @ApiResponse({ status: 200, description: 'Login succeeded, token returned', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid phone or password' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto.phone, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the current authenticated user and roles' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: MeResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  getMe(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrgId() orgId: string,
  ): Promise<MeResponseDto> {
    return this.authService.getMe(user.userId, orgId);
  }
}
