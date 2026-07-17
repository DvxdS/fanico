import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import { Role } from '../users/entities/user-shop-role.entity';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.AUDITOR)
  @ApiOperation({ summary: 'List notifications (org-scoped), for inspecting the queue/log' })
  @ApiResponse({ status: 200, description: 'Recent notifications (max 100)' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.list(orgId, query);
  }
}
