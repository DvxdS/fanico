import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaymentRecord } from '../payments/entities/payment-record.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketItem } from '../tickets/entities/ticket-item.entity';
import { Service } from '../catalog/entities/service.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CashDrawerSession } from '../cash-drawer/entities/cash-drawer-session.entity';
import {
  DateWindow,
  dayWindow,
  monthWindow,
  percentDelta,
  weekDayWindows,
  weekWindow,
} from './report-windows';
import { ReportPeriod } from './dto/report-queries.dto';
import {
  ConsolidatedReportDto,
  DailyReportDto,
  MonthlyReportDto,
  WeeklyReportDto,
} from './dto/report-responses.dto';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // --- daily ---------------------------------------------------------------

  async getDaily(
    orgId: string,
    shopId: string,
    date: string,
  ): Promise<DailyReportDto> {
    const w = dayWindow(date);

    const totalRevenueXof = await this.sumRevenue(orgId, shopId, w);

    const methodRows = await this.dataSource
      .createQueryBuilder(PaymentRecord, 'p')
      .innerJoin(Ticket, 't', 't.id = p.ticketId')
      .select('p.method', 'method')
      .addSelect('COALESCE(SUM(p.amountXof), 0)', 'sum')
      .where('t.orgId = :orgId AND t.shopId = :shopId', { orgId, shopId })
      .andWhere('p.recordedAt >= :from AND p.recordedAt < :to', w)
      .groupBy('p.method')
      .getRawMany<{ method: string; sum: string }>();

    const statusRows = await this.dataSource
      .createQueryBuilder(Ticket, 't')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.orgId = :orgId AND t.shopId = :shopId', { orgId, shopId })
      .andWhere('t.createdAt < :to', { to: w.to })
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string }>();

    const cash = await this.dataSource
      .createQueryBuilder(CashDrawerSession, 's')
      .select('COUNT(*)', 'sessions')
      .addSelect('COALESCE(SUM(s.startingAmountXof), 0)', 'starting')
      .addSelect('COALESCE(SUM(s.endingAmountXof), 0)', 'ending')
      .addSelect('COALESCE(SUM(s.expectedAmountXof), 0)', 'expected')
      .addSelect('COALESCE(SUM(s.discrepancyXof), 0)', 'discrepancy')
      .addSelect(
        `COUNT(*) FILTER (WHERE s.status = 'flagged')`,
        'flagged',
      )
      .where('s.orgId = :orgId AND s.shopId = :shopId', { orgId, shopId })
      .andWhere('s.openedAt >= :from AND s.openedAt < :to', w)
      .getRawOne<{
        sessions: string;
        starting: string;
        ending: string;
        expected: string;
        discrepancy: string;
        flagged: string;
      }>();

    return {
      shopId,
      date,
      totalRevenueXof,
      revenueByMethod: methodRows.map((r) => ({
        method: r.method as DailyReportDto['revenueByMethod'][number]['method'],
        amountXof: Number(r.sum),
      })),
      ticketCountsByStatus: statusRows.map((r) => ({
        status: r.status as DailyReportDto['ticketCountsByStatus'][number]['status'],
        count: Number(r.count),
      })),
      cashDrawer: {
        sessions: Number(cash?.sessions ?? 0),
        startingTotalXof: Number(cash?.starting ?? 0),
        endingTotalXof: Number(cash?.ending ?? 0),
        expectedTotalXof: Number(cash?.expected ?? 0),
        discrepancyTotalXof: Number(cash?.discrepancy ?? 0),
        flaggedCount: Number(cash?.flagged ?? 0),
      },
    };
  }

  // --- weekly --------------------------------------------------------------

  async getWeekly(
    orgId: string,
    shopId: string,
    weekStart: string,
  ): Promise<WeeklyReportDto> {
    const days = weekDayWindows(weekStart);
    const revenuePerDayXof = await Promise.all(
      days.map((d) => this.sumRevenue(orgId, shopId, d)),
    );
    const totalRevenueXof = revenuePerDayXof.reduce((a, b) => a + b, 0);

    const prevWeek = weekWindow(weekStart);
    const prevFrom = new Date(prevWeek.from);
    prevFrom.setUTCDate(prevFrom.getUTCDate() - 7);
    const previousWeekRevenueXof = await this.sumRevenue(orgId, shopId, {
      from: prevFrom,
      to: prevWeek.from,
    });

    const w = weekWindow(weekStart);
    const topRows = await this.dataSource
      .createQueryBuilder(PaymentRecord, 'p')
      .innerJoin(Ticket, 't', 't.id = p.ticketId')
      .innerJoin('customers', 'c', 'c.id = t.customerId')
      .select('c.id', 'customerId')
      .addSelect('c.fullName', 'fullName')
      .addSelect('COALESCE(SUM(p.amountXof), 0)', 'spent')
      .where('t.orgId = :orgId AND t.shopId = :shopId', { orgId, shopId })
      .andWhere('p.recordedAt >= :from AND p.recordedAt < :to', w)
      .groupBy('c.id')
      .addGroupBy('c.fullName')
      .orderBy('spent', 'DESC')
      .limit(5)
      .getRawMany<{ customerId: string; fullName: string; spent: string }>();

    return {
      shopId,
      weekStart,
      revenuePerDayXof,
      totalRevenueXof,
      previousWeekRevenueXof,
      deltaVsPrevWeekPct: percentDelta(totalRevenueXof, previousWeekRevenueXof),
      topCustomers: topRows.map((r) => ({
        customerId: r.customerId,
        fullName: r.fullName,
        spentXof: Number(r.spent),
      })),
    };
  }

  // --- monthly -------------------------------------------------------------

  async getMonthly(
    orgId: string,
    shopId: string,
    month: string,
  ): Promise<MonthlyReportDto> {
    const w = monthWindow(month);
    const totalRevenueXof = await this.sumRevenue(orgId, shopId, w);

    const ticketsTotal = await this.dataSource
      .createQueryBuilder(Ticket, 't')
      .where('t.orgId = :orgId AND t.shopId = :shopId', { orgId, shopId })
      .andWhere('t.createdAt >= :from AND t.createdAt < :to', w)
      .getCount();

    const catRows = await this.dataSource
      .createQueryBuilder(TicketItem, 'i')
      .innerJoin(Ticket, 't', 't.id = i.ticketId')
      .innerJoin(Service, 's', 's.id = i.serviceId')
      .select('s.category', 'category')
      .addSelect('COALESCE(SUM(i.lineTotalXof), 0)', 'sum')
      .where('t.orgId = :orgId AND t.shopId = :shopId', { orgId, shopId })
      .andWhere('t.createdAt >= :from AND t.createdAt < :to', w)
      .groupBy('s.category')
      .getRawMany<{ category: string; sum: string }>();

    return {
      shopId,
      month,
      totalRevenueXof,
      ticketsTotal,
      billedByCategoryXof: catRows.map((r) => ({
        category:
          r.category as MonthlyReportDto['billedByCategoryXof'][number]['category'],
        amountXof: Number(r.sum),
      })),
      // TODO(step5): populate costsXof from the Expenses module for real margin.
      margin: { grossRevenueXof: totalRevenueXof, costsXof: null },
    };
  }

  // --- consolidated --------------------------------------------------------

  async getConsolidated(
    orgId: string,
    period: ReportPeriod,
    date: string,
  ): Promise<ConsolidatedReportDto> {
    const w = this.windowForPeriod(period, date);

    const shops = await this.dataSource
      .getRepository(Shop)
      .find({ where: { orgId } });

    const revenueRows = await this.dataSource
      .createQueryBuilder(PaymentRecord, 'p')
      .innerJoin(Ticket, 't', 't.id = p.ticketId')
      .select('t.shopId', 'shopId')
      .addSelect('COALESCE(SUM(p.amountXof), 0)', 'sum')
      .where('t.orgId = :orgId', { orgId })
      .andWhere('p.recordedAt >= :from AND p.recordedAt < :to', w)
      .groupBy('t.shopId')
      .getRawMany<{ shopId: string; sum: string }>();
    const revenueByShop = new Map(
      revenueRows.map((r) => [r.shopId, Number(r.sum)]),
    );

    const ticketRows = await this.dataSource
      .createQueryBuilder(Ticket, 't')
      .select('t.shopId', 'shopId')
      .addSelect('COUNT(*)', 'count')
      .where('t.orgId = :orgId', { orgId })
      .andWhere('t.createdAt >= :from AND t.createdAt < :to', w)
      .groupBy('t.shopId')
      .getRawMany<{ shopId: string; count: string }>();
    const ticketsByShop = new Map(
      ticketRows.map((r) => [r.shopId, Number(r.count)]),
    );

    const perShop = shops.map((s) => ({
      shopId: s.id,
      shopName: s.name,
      totalRevenueXof: revenueByShop.get(s.id) ?? 0,
      ticketsCreated: ticketsByShop.get(s.id) ?? 0,
    }));
    const totalRevenueXof = perShop.reduce((a, s) => a + s.totalRevenueXof, 0);

    return {
      orgId,
      period,
      date,
      from: w.from.toISOString(),
      to: w.to.toISOString(),
      totalRevenueXof,
      perShop,
    };
  }

  // --- helpers -------------------------------------------------------------

  private windowForPeriod(period: ReportPeriod, date: string): DateWindow {
    switch (period) {
      case ReportPeriod.DAILY:
        return dayWindow(date);
      case ReportPeriod.WEEKLY:
        return weekWindow(date);
      case ReportPeriod.MONTHLY:
        return monthWindow(date);
    }
  }

  /** Sum of payments (all methods) for a shop within [from, to). */
  private async sumRevenue(
    orgId: string,
    shopId: string,
    w: DateWindow,
  ): Promise<number> {
    const raw = await this.dataSource
      .createQueryBuilder(PaymentRecord, 'p')
      .innerJoin(Ticket, 't', 't.id = p.ticketId')
      .select('COALESCE(SUM(p.amountXof), 0)', 'sum')
      .where('t.orgId = :orgId AND t.shopId = :shopId', { orgId, shopId })
      .andWhere('p.recordedAt >= :from AND p.recordedAt < :to', w)
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }
}
