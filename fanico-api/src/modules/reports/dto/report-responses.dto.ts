import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../payments/entities/payment-record.entity';
import { TicketStatus } from '../../tickets/entities/ticket.entity';
import { ServiceCategory } from '../../catalog/entities/service.entity';
import { ReportPeriod } from './report-queries.dto';

export class AmountByMethodDto {
  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ example: 12000 })
  amountXof: number;
}

export class CountByStatusDto {
  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty({ example: 4 })
  count: number;
}

export class AmountByCategoryDto {
  @ApiProperty({ enum: ServiceCategory })
  category: ServiceCategory;

  @ApiProperty({ example: 45000 })
  amountXof: number;
}

export class CashDrawerSummaryDto {
  @ApiProperty({ example: 2 }) sessions: number;
  @ApiProperty({ example: 40000 }) startingTotalXof: number;
  @ApiProperty({ example: 61500 }) endingTotalXof: number;
  @ApiProperty({ example: 61500 }) expectedTotalXof: number;
  @ApiProperty({ example: 0 }) discrepancyTotalXof: number;
  @ApiProperty({ example: 1 }) flaggedCount: number;
}

export class DailyReportDto {
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ example: '2026-07-16' }) date: string;
  @ApiProperty({ example: 21500 }) totalRevenueXof: number;
  @ApiProperty({ type: [AmountByMethodDto] }) revenueByMethod: AmountByMethodDto[];
  @ApiProperty({ type: [CountByStatusDto] }) ticketCountsByStatus: CountByStatusDto[];
  @ApiProperty({ type: CashDrawerSummaryDto }) cashDrawer: CashDrawerSummaryDto;
}

export class TopCustomerDto {
  @ApiProperty({ format: 'uuid' }) customerId: string;
  @ApiProperty({ example: 'Koffi Yao' }) fullName: string;
  @ApiProperty({ example: 18000 }) spentXof: number;
}

export class WeeklyReportDto {
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ example: '2026-07-13' }) weekStart: string;
  @ApiProperty({ type: [Number], example: [0, 1500, 0, 6000, 3000, 0, 0] })
  revenuePerDayXof: number[];
  @ApiProperty({ example: 10500 }) totalRevenueXof: number;
  @ApiProperty({ example: 8000 }) previousWeekRevenueXof: number;
  @ApiProperty({ example: 31.3 }) deltaVsPrevWeekPct: number;
  @ApiProperty({ type: [TopCustomerDto] }) topCustomers: TopCustomerDto[];
}

export class MarginDto {
  @ApiProperty({ example: 120000 }) grossRevenueXof: number;
  @ApiProperty({
    nullable: true,
    example: null,
    description: 'Costs unavailable until the Expenses module (Step 5)',
  })
  costsXof: number | null;
}

export class MonthlyReportDto {
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ example: '2026-07' }) month: string;
  @ApiProperty({ example: 120000 }) totalRevenueXof: number;
  @ApiProperty({ example: 42 }) ticketsTotal: number;
  @ApiProperty({ type: [AmountByCategoryDto] }) billedByCategoryXof: AmountByCategoryDto[];
  @ApiProperty({ type: MarginDto }) margin: MarginDto;
}

export class PerShopBreakdownDto {
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ example: 'Fanico Plateau' }) shopName: string;
  @ApiProperty({ example: 82000 }) totalRevenueXof: number;
  @ApiProperty({ example: 30 }) ticketsCreated: number;
}

export class ConsolidatedReportDto {
  @ApiProperty({ format: 'uuid' }) orgId: string;
  @ApiProperty({ enum: ReportPeriod }) period: ReportPeriod;
  @ApiProperty({ example: '2026-07-16' }) date: string;
  @ApiProperty({ example: '2026-07-16T00:00:00.000Z' }) from: string;
  @ApiProperty({ example: '2026-07-17T00:00:00.000Z' }) to: string;
  @ApiProperty({ example: 164000 }) totalRevenueXof: number;
  @ApiProperty({ type: [PerShopBreakdownDto] }) perShop: PerShopBreakdownDto[];
}
