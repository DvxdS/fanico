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
import { AuditService } from './audit.service';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.OWNER, Role.AUDITOR)
  @ApiOperation({ summary: 'Query the audit trail (OWNER/AUDITOR only), paginated' })
  @ApiResponse({ status: 200, description: 'Paged audit log entries' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListAuditQueryDto,
  ) {
    return this.auditService.list(orgId, query);
  }
}
