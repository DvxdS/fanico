import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import { ALL_STAFF, MANAGERS } from '../../common/constants/role-groups';
import { CatalogService } from './catalog.service';
import {
  CreatePriceOverrideDto,
  ListPriceOverridesQueryDto,
  UpdatePriceOverrideDto,
} from './dto/price-override.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/price-overrides')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @Roles(...MANAGERS)
  @Audit('price_override', AuditAction.CREATE)
  @ApiOperation({ summary: 'Create a shop-specific price override for a service (manager+)' })
  @ApiResponse({ status: 201, description: 'Override created' })
  @ApiResponse({ status: 400, description: 'Shop/service not in org or override already exists' })
  create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreatePriceOverrideDto,
  ) {
    return this.catalogService.createOverride(orgId, dto);
  }

  @Patch(':id')
  @Roles(...MANAGERS)
  @Audit('price_override', AuditAction.UPDATE)
  @ApiOperation({ summary: 'Update a price override (manager+)' })
  @ApiParam({ name: 'id', description: 'Override id (uuid)' })
  @ApiResponse({ status: 200, description: 'Override updated' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  update(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceOverrideDto,
  ) {
    return this.catalogService.updateOverride(orgId, id, dto);
  }

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'List price overrides (org-scoped) with pagination' })
  @ApiResponse({ status: 200, description: 'Paged overrides' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListPriceOverridesQueryDto,
  ) {
    return this.catalogService.listOverrides(orgId, query);
  }
}
