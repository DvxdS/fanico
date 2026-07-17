import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../users/entities/user-shop-role.entity';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { CashDrawerService } from './cash-drawer.service';
import { OpenDrawerDto } from './dto/open-drawer.dto';
import { CloseDrawerDto } from './dto/close-drawer.dto';
import { ListDrawersQueryDto } from './dto/list-drawers-query.dto';

@ApiTags('cash-drawer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-drawers')
export class CashDrawerController {
  constructor(private readonly cashDrawerService: CashDrawerService) {}

  @Post('open')
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Open a cash drawer session (one open per cashier per shop)' })
  @ApiResponse({ status: 201, description: 'Drawer opened' })
  @ApiResponse({ status: 400, description: 'Cashier already has an open drawer in this shop' })
  open(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OpenDrawerDto,
  ) {
    return this.cashDrawerService.open(orgId, user.userId, dto);
  }

  @Post(':id/close')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Close & reconcile a drawer; flags if abs(discrepancy) > 500 XOF' })
  @ApiParam({ name: 'id', description: 'Cash drawer session id (uuid)' })
  @ApiResponse({ status: 200, description: 'Drawer closed (or flagged)' })
  @ApiResponse({ status: 400, description: 'Session already closed' })
  @ApiResponse({ status: 403, description: 'Not the owning cashier' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  close(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseDrawerDto,
  ) {
    return this.cashDrawerService.close(orgId, user.userId, id, dto);
  }

  @Get('current')
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Get the requesting cashier\'s currently open drawer for a shop' })
  @ApiQuery({ name: 'shopId', description: 'Shop id (uuid)', required: true })
  @ApiResponse({ status: 200, description: 'Open session' })
  @ApiResponse({ status: 404, description: 'No open drawer for this cashier/shop' })
  current(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.cashDrawerService.current(orgId, user.userId, shopId);
  }

  @Get()
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.CASHIER, Role.AUDITOR)
  @ApiOperation({ summary: 'List cash drawer sessions (org-scoped) with filters + pagination' })
  @ApiResponse({ status: 200, description: 'Paged list of sessions' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListDrawersQueryDto,
  ) {
    return this.cashDrawerService.list(orgId, query);
  }
}
