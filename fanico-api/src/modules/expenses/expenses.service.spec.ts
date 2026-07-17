import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ExpensesService } from './expenses.service';
import { Expense, ExpenseCategory } from './entities/expense.entity';
import { Shop } from '../shops/entities/shop.entity';
import { PaymentMethod } from '../payments/entities/payment-record.entity';

describe('ExpensesService', () => {
  let expenseRepo: { create: jest.Mock; save: jest.Mock; findAndCount: jest.Mock };
  let shopRepo: { findOne: jest.Mock };
  let service: ExpensesService;

  const baseDto = {
    category: ExpenseCategory.WATER,
    amountXof: 8000,
    method: PaymentMethod.CASH,
    date: '2026-07-16',
  };

  beforeEach(() => {
    expenseRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ id: 'exp-1', ...v })),
      findAndCount: jest.fn(async () => [[], 0]),
    };
    shopRepo = { findOne: jest.fn() };
    service = new ExpensesService(
      expenseRepo as unknown as Repository<Expense>,
      shopRepo as unknown as Repository<Shop>,
    );
  });

  it('records an org-wide expense (no shopId) without touching shops', async () => {
    const result = await service.create('org-1', 'user-1', baseDto);
    expect(shopRepo.findOne).not.toHaveBeenCalled();
    expect(expenseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', shopId: null, recordedByUserId: 'user-1' }),
    );
    expect(result.id).toBe('exp-1');
  });

  it('rejects a shop-level expense when the shop is not in the org', async () => {
    shopRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create('org-1', 'user-1', { ...baseDto, shopId: 'shop-x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists expenses scoped by orgId and returns a paged shape', async () => {
    const res = await service.findAll('org-1', {});
    expect(res).toEqual({ data: [], total: 0, limit: 20, offset: 0 });
    expect(expenseRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orgId: 'org-1' }) }),
    );
  });
});
