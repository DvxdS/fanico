import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Expense } from './entities/expense.entity';
import { Shop } from '../shops/entities/shop.entity';
import { PaymentMethod } from '../payments/entities/payment-record.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async create(
    orgId: string,
    actorUserId: string,
    dto: CreateExpenseDto,
  ): Promise<Expense> {
    if (dto.shopId) {
      const shop = await this.shopRepo.findOne({
        where: { id: dto.shopId, orgId },
      });
      if (!shop) {
        throw new BadRequestException('Shop not found in this organization');
      }
    }
    return this.expenseRepo.save(
      this.expenseRepo.create({
        orgId,
        shopId: dto.shopId ?? null,
        category: dto.category,
        amountXof: dto.amountXof,
        method: dto.method,
        date: dto.date,
        vendor: dto.vendor ?? null,
        notes: dto.notes ?? null,
        photoPath: dto.photoPath ?? null,
        recordedByUserId: actorUserId,
      }),
    );
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({ where: { id, orgId } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    Object.assign(expense, {
      category: dto.category ?? expense.category,
      amountXof: dto.amountXof ?? expense.amountXof,
      method: dto.method ?? expense.method,
      vendor: dto.vendor ?? expense.vendor,
      notes: dto.notes ?? expense.notes,
    });
    return this.expenseRepo.save(expense);
  }

  async findAll(
    orgId: string,
    query: ListExpensesQueryDto,
  ): Promise<{ data: Expense[]; total: number; limit: number; offset: number }> {
    const where: FindOptionsWhere<Expense> = { orgId };
    if (query.shopId) where.shopId = query.shopId;
    if (query.category) where.category = query.category;
    if (query.from && query.to) {
      where.date = Between(query.from, query.to);
    } else if (query.from) {
      where.date = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.date = LessThanOrEqual(query.to);
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.expenseRepo.findAndCount({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOne(orgId: string, id: string): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({ where: { id, orgId } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  /**
   * Sum of CASH expenses recorded (createdAt) within [from, to] for a shop —
   * subtracted from a cash drawer's expected amount. Org-wide expenses
   * (shopId null) are excluded: they don't come from a shop drawer.
   */
  async sumCashForShopBetween(
    manager: EntityManager,
    orgId: string,
    shopId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const raw = await manager
      .createQueryBuilder(Expense, 'e')
      .select('COALESCE(SUM(e.amountXof), 0)', 'sum')
      .where('e.orgId = :orgId AND e.shopId = :shopId', { orgId, shopId })
      .andWhere('e.method = :method', { method: PaymentMethod.CASH })
      .andWhere('e.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('e.deletedAt IS NULL')
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }
}
