import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, Matches } from 'class-validator';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const YM = /^\d{4}-\d{2}$/;

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class DailyReportQueryDto {
  @ApiProperty({ description: 'Shop id', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Day to report on (YYYY-MM-DD, UTC)', example: '2026-07-16' })
  @Matches(YMD, { message: 'date must be YYYY-MM-DD' })
  date: string;
}

export class WeeklyReportQueryDto {
  @ApiProperty({ description: 'Shop id', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({
    description: 'First day of the 7-day week (YYYY-MM-DD, UTC)',
    example: '2026-07-13',
  })
  @Matches(YMD, { message: 'weekStart must be YYYY-MM-DD' })
  weekStart: string;
}

export class MonthlyReportQueryDto {
  @ApiProperty({ description: 'Shop id', format: 'uuid' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Month to report on (YYYY-MM)', example: '2026-07' })
  @Matches(YM, { message: 'month must be YYYY-MM' })
  month: string;
}

export class ConsolidatedReportQueryDto {
  @ApiProperty({ enum: ReportPeriod, description: 'Which period to aggregate' })
  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @ApiProperty({
    description:
      'Reference date: YYYY-MM-DD for daily/weekly (week start), YYYY-MM for monthly',
    example: '2026-07-16',
  })
  @IsString()
  date: string;
}
