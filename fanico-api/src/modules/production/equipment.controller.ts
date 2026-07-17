import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
import { ALL_STAFF } from '../../common/constants/role-groups';
import { ProductionService } from './production.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { ListEquipmentQueryDto } from './dto/list-queries.dto';

@ApiTags('production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @Roles(Role.OWNER, Role.SHOP_MANAGER)
  @ApiOperation({ summary: 'Register a piece of equipment for a shop (manager+)' })
  @ApiResponse({ status: 201, description: 'Equipment created' })
  @ApiResponse({ status: 400, description: 'Shop not found in this organization' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  create(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateEquipmentDto,
  ) {
    return this.productionService.createEquipment(orgId, dto);
  }

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'List equipment (org-scoped), optionally by shop, paginated' })
  @ApiResponse({ status: 200, description: 'Paged equipment list' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListEquipmentQueryDto,
  ) {
    return this.productionService.listEquipment(orgId, query);
  }
}
