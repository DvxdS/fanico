import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

/**
 * Reports are read-only aggregate queries via the shared DataSource — no
 * repositories or migration needed here.
 */
@Module({
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
