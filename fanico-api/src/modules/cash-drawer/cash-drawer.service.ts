import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  CashDrawerSession,
  CashDrawerStatus,
} from './entities/cash-drawer-session.entity';
import { Shop } from '../shops/entities/shop.entity';
import { PaymentsService } from '../payments/payments.service';
import { ExpensesService } from '../expenses/expenses.service';
import { OpenDrawerDto } from './dto/open-drawer.dto';
import { CloseDrawerDto } from './dto/close-drawer.dto';
import { ListDrawersQueryDto } from './dto/list-drawers-query.dto';

// Cash count discrepancy tolerance. Above this (absolute) the session is
// flagged rather than cleanly closed.
// DECISION NEEDED: make configurable per org/shop later.
export const CASH_DISCREPANCY_THRESHOLD_XOF = 500;

export interface ReconcileInput {
  startingAmountXof: number;
  cashInXof: number;
  cashExpensesXof: number;
  endingAmountXof: number;
  threshold: number;
}

export interface ReconcileResult {
  expectedAmountXof: number;
  discrepancyXof: number;
  status: CashDrawerStatus;
}

/**
 * Pure cash-drawer reconciliation. Kept free of I/O so it can be unit-tested
 * exhaustively (exact / overage / shortage / within-threshold).
 */
export function reconcile(input: ReconcileInput): ReconcileResult {
  const expectedAmountXof =
    input.startingAmountXof + input.cashInXof - input.cashExpensesXof;
  const discrepancyXof = input.endingAmountXof - expectedAmountXof;
  const status =
    Math.abs(discrepancyXof) > input.threshold
      ? CashDrawerStatus.FLAGGED
      : CashDrawerStatus.CLOSED;
  return { expectedAmountXof, discrepancyXof, status };
}

@Injectable()
export class CashDrawerService {
  constructor(
    @InjectRepository(CashDrawerSession)
    private readonly sessionRepo: Repository<CashDrawerSession>,
    private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    private readonly expensesService: ExpensesService,
  ) {}

  async open(
    orgId: string,
    cashierUserId: string,
    dto: OpenDrawerDto,
  ): Promise<CashDrawerSession> {
    const id = await this.dataSource.transaction(async (manager) => {
      const shop = await manager.findOne(Shop, {
        where: { id: dto.shopId, orgId },
      });
      if (!shop) {
        throw new BadRequestException('Shop not found in this organization');
      }

      const existing = await manager.findOne(CashDrawerSession, {
        where: {
          shopId: dto.shopId,
          cashierUserId,
          status: CashDrawerStatus.OPEN,
        },
      });
      if (existing) {
        throw new BadRequestException(
          'You already have an open cash drawer in this shop',
        );
      }

      const session = await manager.save(
        manager.create(CashDrawerSession, {
          orgId,
          shopId: dto.shopId,
          cashierUserId,
          startingAmountXof: dto.startingAmountXof,
          status: CashDrawerStatus.OPEN,
          notes: dto.notes ?? null,
        }),
      );
      return session.id;
    });
    return this.findSession(orgId, id);
  }

  async close(
    orgId: string,
    cashierUserId: string,
    id: string,
    dto: CloseDrawerDto,
  ): Promise<CashDrawerSession> {
    await this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(CashDrawerSession, {
        where: { id, orgId },
      });
      if (!session) {
        throw new NotFoundException('Cash drawer session not found');
      }
      if (session.cashierUserId !== cashierUserId) {
        throw new ForbiddenException(
          'Only the owning cashier can close this drawer',
        );
      }
      if (session.status !== CashDrawerStatus.OPEN) {
        throw new BadRequestException('Cash drawer session is already closed');
      }

      const closedAt = new Date();
      const cashInXof = await this.paymentsService.sumCashForShopBetween(
        manager,
        session.shopId,
        session.openedAt,
        closedAt,
      );
      const cashExpensesXof = await this.expensesService.sumCashForShopBetween(
        manager,
        session.orgId,
        session.shopId,
        session.openedAt,
        closedAt,
      );

      const r = reconcile({
        startingAmountXof: session.startingAmountXof,
        cashInXof,
        cashExpensesXof,
        endingAmountXof: dto.endingAmountXof,
        threshold: CASH_DISCREPANCY_THRESHOLD_XOF,
      });

      session.closedAt = closedAt;
      session.endingAmountXof = dto.endingAmountXof;
      session.expectedAmountXof = r.expectedAmountXof;
      session.discrepancyXof = r.discrepancyXof;
      session.status = r.status;
      if (dto.notes !== undefined) {
        session.notes = dto.notes;
      }
      await manager.save(session);
    });
    return this.findSession(orgId, id);
  }

  async current(
    orgId: string,
    cashierUserId: string,
    shopId: string,
  ): Promise<CashDrawerSession> {
    const session = await this.sessionRepo.findOne({
      where: {
        orgId,
        shopId,
        cashierUserId,
        status: CashDrawerStatus.OPEN,
      },
    });
    if (!session) {
      throw new NotFoundException('No open cash drawer for this cashier/shop');
    }
    return session;
  }

  async list(
    orgId: string,
    query: ListDrawersQueryDto,
  ): Promise<{
    data: CashDrawerSession[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: FindOptionsWhere<CashDrawerSession> = { orgId };
    if (query.shopId) where.shopId = query.shopId;
    if (query.from && query.to) {
      where.openedAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.openedAt = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.openedAt = LessThan(new Date(query.to));
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.sessionRepo.findAndCount({
      where,
      order: { openedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  private async findSession(
    orgId: string,
    id: string,
  ): Promise<CashDrawerSession> {
    const session = await this.sessionRepo.findOne({ where: { id, orgId } });
    if (!session) {
      throw new NotFoundException('Cash drawer session not found');
    }
    return session;
  }
}
