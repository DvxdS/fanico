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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../users/entities/user-shop-role.entity';
import { ALL_STAFF } from '../../common/constants/role-groups';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ProductionService } from './production.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QcBatchDto } from './dto/qc-batch.dto';
import { ListBatchesQueryDto } from './dto/list-queries.dto';

@ApiTags('production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batches')
export class BatchesController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a batch from unbatched ticket items (moves tickets to IN_PRODUCTION)' })
  @ApiResponse({ status: 201, description: 'Batch created at WASHING stage' })
  @ApiResponse({ status: 400, description: 'Items invalid (batched, wrong shop, mixed categories, ...)' })
  create(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBatchDto,
  ) {
    return this.productionService.createBatch(orgId, user.userId, dto);
  }

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'List batches (org-scoped), optionally by shop/stage, paginated' })
  @ApiResponse({ status: 200, description: 'Paged batches' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListBatchesQueryDto,
  ) {
    return this.productionService.listBatches(orgId, query);
  }

  @Post(':id/advance')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Advance a batch one stage (WASHING->DRYING->IRONING->QC->READY)' })
  @ApiParam({ name: 'id', description: 'Batch id (uuid)' })
  @ApiResponse({ status: 200, description: 'Batch advanced' })
  @ApiResponse({ status: 400, description: 'Batch already READY' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  advance(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productionService.advance(orgId, user.userId, id);
  }

  @Post(':id/qc')
  @HttpCode(200)
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'QC a batch: pass -> READY, fail -> back to IRONING (reason required)' })
  @ApiParam({ name: 'id', description: 'Batch id (uuid)' })
  @ApiResponse({ status: 200, description: 'QC recorded' })
  @ApiResponse({ status: 400, description: 'Not at QC stage, or missing reason on fail' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  qc(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QcBatchDto,
  ) {
    return this.productionService.qc(orgId, user.userId, id, dto);
  }

  @Get(':id')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Fetch a batch by id' })
  @ApiParam({ name: 'id', description: 'Batch id (uuid)' })
  @ApiResponse({ status: 200, description: 'Batch found' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  findOne(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productionService.findBatch(orgId, id);
  }
}
