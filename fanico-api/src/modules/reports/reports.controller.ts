import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org-id.decorator';
import { Role } from '../users/entities/user-shop-role.entity';
import { ReportsService } from './reports.service';
import {
  ConsolidatedReportQueryDto,
  DailyReportQueryDto,
  MonthlyReportQueryDto,
  WeeklyReportQueryDto,
} from './dto/report-queries.dto';
import {
  ConsolidatedReportDto,
  DailyReportDto,
  MonthlyReportDto,
  WeeklyReportDto,
} from './dto/report-responses.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.AUDITOR)
  @ApiOperation({ summary: 'Daily report for a shop: revenue, by method, ticket counts, cash drawer' })
  @ApiOkResponse({ type: DailyReportDto })
  daily(
    @CurrentOrgId() orgId: string,
    @Query() query: DailyReportQueryDto,
  ): Promise<DailyReportDto> {
    return this.reportsService.getDaily(orgId, query.shopId, query.date);
  }

  @Get('weekly')
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.AUDITOR)
  @ApiOperation({ summary: 'Weekly report: per-day revenue, delta vs previous week, top 5 customers' })
  @ApiOkResponse({ type: WeeklyReportDto })
  weekly(
    @CurrentOrgId() orgId: string,
    @Query() query: WeeklyReportQueryDto,
  ): Promise<WeeklyReportDto> {
    return this.reportsService.getWeekly(orgId, query.shopId, query.weekStart);
  }

  @Get('monthly')
  @Roles(Role.OWNER, Role.SHOP_MANAGER, Role.AUDITOR)
  @ApiOperation({ summary: 'Monthly report: revenue, tickets, billed-by-category, margin placeholder' })
  @ApiOkResponse({ type: MonthlyReportDto })
  monthly(
    @CurrentOrgId() orgId: string,
    @Query() query: MonthlyReportQueryDto,
  ): Promise<MonthlyReportDto> {
    return this.reportsService.getMonthly(orgId, query.shopId, query.month);
  }

  @Get('consolidated')
  @Roles(Role.OWNER, Role.AUDITOR)
  @ApiOperation({ summary: 'Org-wide consolidated report with per-shop breakdown (orgId from JWT)' })
  @ApiOkResponse({ type: ConsolidatedReportDto })
  consolidated(
    @CurrentOrgId() orgId: string,
    @Query() query: ConsolidatedReportQueryDto,
  ): Promise<ConsolidatedReportDto> {
    return this.reportsService.getConsolidated(orgId, query.period, query.date);
  }
}
