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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FRONT_DESK, ALL_STAFF, MANAGERS } from '../../common/constants/role-groups';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(...FRONT_DESK)
  @Audit('expense', AuditAction.CREATE)
  @ApiOperation({ summary: 'Record an expense (shop-level or org-wide)' })
  @ApiResponse({ status: 201, description: 'Expense recorded' })
  @ApiResponse({ status: 400, description: 'Shop not in org' })
  create(
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(orgId, user.userId, dto);
  }

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'List expenses (org-scoped) with filters + pagination' })
  @ApiResponse({ status: 200, description: 'Paged expenses' })
  findAll(
    @CurrentOrgId() orgId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expensesService.findAll(orgId, query);
  }

  @Patch(':id')
  @Roles(...MANAGERS)
  @Audit('expense', AuditAction.UPDATE)
  @ApiOperation({ summary: 'Amend an expense (manager+)' })
  @ApiParam({ name: 'id', description: 'Expense id (uuid)' })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  update(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(orgId, id, dto);
  }
}
