import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductionService } from './production.service';
import { Batch, BatchStage } from './entities/batch.entity';
import { Equipment } from './entities/equipment.entity';
import { TicketsService } from '../tickets/tickets.service';
import { InvalidBatchTransitionException } from '../../common/exceptions/invalid-batch-transition.exception';
import { QcResult } from './dto/qc-batch.dto';

function makeBatch(stage: BatchStage): Batch {
  return {
    id: 'batch-1',
    orgId: 'org-1',
    shopId: 'shop-1',
    currentStage: stage,
    readyAt: null,
  } as Batch;
}

describe('ProductionService — batch stage ordering', () => {
  let service: ProductionService;
  let batchRepo: { findOne: jest.Mock };
  let tickets: { markReadyFromProduction: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    const qb: Record<string, unknown> = {};
    for (const m of ['select', 'where', 'andWhere', 'leftJoin', 'innerJoin']) {
      qb[m] = () => qb;
    }
    qb.getRawMany = async () => [];
    qb.getCount = async () => 0;

    manager = {
      findOne: jest.fn(),
      create: jest.fn((_e: unknown, v: unknown) => v),
      save: jest.fn(async (_e: unknown, v: unknown) => v),
      update: jest.fn(async () => undefined),
      createQueryBuilder: jest.fn(() => qb),
    };

    batchRepo = { findOne: jest.fn() };
    tickets = { markReadyFromProduction: jest.fn() };

    const dataSource = {
      transaction: async (cb: (m: unknown) => Promise<unknown>) => cb(manager),
    };

    service = new ProductionService(
      batchRepo as unknown as Repository<Batch>,
      {} as unknown as Repository<Equipment>,
      dataSource as never,
      tickets as unknown as TicketsService,
      { emit: jest.fn() } as never,
    );
  });

  it('advances WASHING -> DRYING -> IRONING -> QC -> READY one step at a time', async () => {
    const batch = makeBatch(BatchStage.WASHING);
    manager.findOne.mockResolvedValue(batch);
    batchRepo.findOne.mockResolvedValue(batch);

    await service.advance('org-1', 'user-1', 'batch-1');
    expect(batch.currentStage).toBe(BatchStage.DRYING);
    await service.advance('org-1', 'user-1', 'batch-1');
    expect(batch.currentStage).toBe(BatchStage.IRONING);
    await service.advance('org-1', 'user-1', 'batch-1');
    expect(batch.currentStage).toBe(BatchStage.QC);
    await service.advance('org-1', 'user-1', 'batch-1');
    expect(batch.currentStage).toBe(BatchStage.READY);
    expect(batch.readyAt).toBeInstanceOf(Date);
  });

  it('refuses to advance past READY', async () => {
    const batch = makeBatch(BatchStage.READY);
    manager.findOne.mockResolvedValue(batch);
    await expect(
      service.advance('org-1', 'user-1', 'batch-1'),
    ).rejects.toBeInstanceOf(InvalidBatchTransitionException);
  });

  it('QC pass moves QC -> READY', async () => {
    const batch = makeBatch(BatchStage.QC);
    manager.findOne.mockResolvedValue(batch);
    batchRepo.findOne.mockResolvedValue(batch);
    await service.qc('org-1', 'user-1', 'batch-1', { result: QcResult.PASS });
    expect(batch.currentStage).toBe(BatchStage.READY);
  });

  it('QC fail reverts QC -> IRONING (with a reason)', async () => {
    const batch = makeBatch(BatchStage.QC);
    manager.findOne.mockResolvedValue(batch);
    batchRepo.findOne.mockResolvedValue(batch);
    await service.qc('org-1', 'user-1', 'batch-1', {
      result: QcResult.FAIL,
      reason: 'collar stained',
    });
    expect(batch.currentStage).toBe(BatchStage.IRONING);
  });

  it('QC fail without a reason throws', async () => {
    const batch = makeBatch(BatchStage.QC);
    manager.findOne.mockResolvedValue(batch);
    await expect(
      service.qc('org-1', 'user-1', 'batch-1', { result: QcResult.FAIL }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('QC from a non-QC stage throws', async () => {
    const batch = makeBatch(BatchStage.WASHING);
    manager.findOne.mockResolvedValue(batch);
    await expect(
      service.qc('org-1', 'user-1', 'batch-1', { result: QcResult.PASS }),
    ).rejects.toBeInstanceOf(InvalidBatchTransitionException);
  });
});
