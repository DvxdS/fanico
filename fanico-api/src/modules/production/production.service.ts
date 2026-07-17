import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import {
  Batch,
  BATCH_STAGE_ORDER,
  BatchStage,
} from './entities/batch.entity';
import { BatchStageEvent } from './entities/batch-stage-event.entity';
import { BatchCounter } from './entities/batch-counter.entity';
import { Equipment } from './entities/equipment.entity';
import { Shop } from '../shops/entities/shop.entity';
import { TicketItem } from '../tickets/entities/ticket-item.entity';
import { TicketStatus } from '../tickets/entities/ticket.entity';
import { TicketsService } from '../tickets/tickets.service';
import {
  TICKET_TRANSITION_EVENT,
  TicketTransitionEvent,
} from '../tickets/events/ticket-transition.event';
import { InvalidBatchTransitionException } from '../../common/exceptions/invalid-batch-transition.exception';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QcBatchDto, QcResult } from './dto/qc-batch.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import {
  ListBatchesQueryDto,
  ListEquipmentQueryDto,
} from './dto/list-queries.dto';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepo: Repository<Batch>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    private readonly dataSource: DataSource,
    private readonly ticketsService: TicketsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- batches -------------------------------------------------------------

  async createBatch(
    orgId: string,
    actorUserId: string,
    dto: CreateBatchDto,
  ): Promise<Batch> {
    const events: TicketTransitionEvent[] = [];
    const id = await this.dataSource.transaction(async (manager) => {
      const shop = await manager.findOne(Shop, {
        where: { id: dto.shopId, orgId },
      });
      if (!shop) {
        throw new BadRequestException('Shop not found in this organization');
      }

      if (dto.equipmentId) {
        const equipment = await manager.findOne(Equipment, {
          where: { id: dto.equipmentId, orgId, shopId: dto.shopId },
        });
        if (!equipment) {
          throw new BadRequestException('Equipment not found in this shop');
        }
      }

      const items = await manager.find(TicketItem, {
        where: { id: In(dto.ticketItemIds) },
        relations: { ticket: true, service: true },
      });
      if (items.length !== dto.ticketItemIds.length) {
        throw new BadRequestException('One or more ticket items were not found');
      }

      for (const item of items) {
        if (item.batchId) {
          throw new BadRequestException(
            `Item ${item.id} is already in a batch`,
          );
        }
        if (item.ticket.orgId !== orgId) {
          throw new BadRequestException('Item does not belong to this organization');
        }
        if (item.ticket.shopId !== dto.shopId) {
          throw new BadRequestException('All items must belong to this shop');
        }
        if (
          item.ticket.status !== TicketStatus.OPEN &&
          item.ticket.status !== TicketStatus.IN_PRODUCTION
        ) {
          throw new BadRequestException(
            `Item's ticket must be OPEN or IN_PRODUCTION (is ${item.ticket.status})`,
          );
        }
      }

      const categories = new Set(items.map((i) => i.service.category));
      if (categories.size > 1) {
        throw new BadRequestException(
          'Items span multiple service categories and cannot share a batch',
        );
      }

      const batchNumber = await this.nextBatchNumber(manager, shop);
      const batch = await manager.save(
        manager.create(Batch, {
          orgId,
          shopId: dto.shopId,
          batchNumber,
          category: dto.category,
          equipmentId: dto.equipmentId ?? null,
          currentStage: BatchStage.WASHING,
          assignedToUserId: actorUserId,
        }),
      );

      await manager.save(
        manager.create(BatchStageEvent, {
          batchId: batch.id,
          stage: BatchStage.WASHING,
          actorUserId,
        }),
      );

      await manager.update(
        TicketItem,
        { id: In(dto.ticketItemIds) },
        { batchId: batch.id },
      );

      const ticketIds = [...new Set(items.map((i) => i.ticketId))];
      for (const ticketId of ticketIds) {
        const evt = await this.ticketsService.moveToProductionFromBatch(
          manager,
          orgId,
          ticketId,
          actorUserId,
        );
        if (evt) events.push(evt);
      }

      return batch.id;
    });

    this.emitEvents(events);
    return this.findBatch(orgId, id);
  }

  async advance(
    orgId: string,
    actorUserId: string,
    id: string,
  ): Promise<Batch> {
    const events: TicketTransitionEvent[] = [];
    await this.dataSource.transaction(async (manager) => {
      const batch = await this.loadBatchOrFail(manager, orgId, id);
      if (batch.currentStage === BatchStage.READY) {
        throw new InvalidBatchTransitionException('Batch is already READY');
      }
      const next =
        BATCH_STAGE_ORDER[BATCH_STAGE_ORDER.indexOf(batch.currentStage) + 1];
      await this.moveStage(manager, batch, next, actorUserId);
      if (next === BatchStage.READY) {
        events.push(
          ...(await this.deriveTicketReadiness(
            manager,
            orgId,
            batch.id,
            actorUserId,
          )),
        );
      }
    });
    this.emitEvents(events);
    return this.findBatch(orgId, id);
  }

  async qc(
    orgId: string,
    actorUserId: string,
    id: string,
    dto: QcBatchDto,
  ): Promise<Batch> {
    const events: TicketTransitionEvent[] = [];
    await this.dataSource.transaction(async (manager) => {
      const batch = await this.loadBatchOrFail(manager, orgId, id);
      if (batch.currentStage !== BatchStage.QC) {
        throw new InvalidBatchTransitionException(
          `QC can only be run from the QC stage (batch is ${batch.currentStage})`,
        );
      }

      if (dto.result === QcResult.PASS) {
        await this.moveStage(manager, batch, BatchStage.READY, actorUserId);
        events.push(
          ...(await this.deriveTicketReadiness(
            manager,
            orgId,
            batch.id,
            actorUserId,
          )),
        );
      } else {
        if (!dto.reason?.trim()) {
          throw new BadRequestException('A reason is required when QC fails');
        }
        await this.moveStage(
          manager,
          batch,
          BatchStage.IRONING,
          actorUserId,
          dto.reason,
        );
      }
    });
    this.emitEvents(events);
    return this.findBatch(orgId, id);
  }

  async listBatches(
    orgId: string,
    query: ListBatchesQueryDto,
  ): Promise<{ data: Batch[]; total: number; limit: number; offset: number }> {
    const where: FindOptionsWhere<Batch> = { orgId };
    if (query.shopId) where.shopId = query.shopId;
    if (query.stage) where.currentStage = query.stage;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.batchRepo.findAndCount({
      where,
      order: { startedAt: 'DESC' },
      relations: { equipment: true },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findBatch(orgId: string, id: string): Promise<Batch> {
    const batch = await this.batchRepo.findOne({
      where: { id, orgId },
      relations: { equipment: true },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    return batch;
  }

  // --- equipment -----------------------------------------------------------

  async createEquipment(
    orgId: string,
    dto: CreateEquipmentDto,
  ): Promise<Equipment> {
    const shop = await this.dataSource.getRepository(Shop).findOne({
      where: { id: dto.shopId, orgId },
    });
    if (!shop) {
      throw new BadRequestException('Shop not found in this organization');
    }
    return this.equipmentRepo.save(
      this.equipmentRepo.create({
        orgId,
        shopId: dto.shopId,
        name: dto.name,
        type: dto.type,
        capacityKg: dto.capacityKg ?? null,
      }),
    );
  }

  async listEquipment(
    orgId: string,
    query: ListEquipmentQueryDto,
  ): Promise<{
    data: Equipment[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: FindOptionsWhere<Equipment> = { orgId };
    if (query.shopId) where.shopId = query.shopId;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.equipmentRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  // --- internals -----------------------------------------------------------

  private async loadBatchOrFail(
    manager: EntityManager,
    orgId: string,
    id: string,
  ): Promise<Batch> {
    const batch = await manager.findOne(Batch, { where: { id, orgId } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    return batch;
  }

  /** Close the current stage event, open the next, and set the batch stage. */
  private async moveStage(
    manager: EntityManager,
    batch: Batch,
    next: BatchStage,
    actorUserId: string,
    notes?: string,
  ): Promise<void> {
    await manager.update(
      BatchStageEvent,
      { batchId: batch.id, stage: batch.currentStage, exitedAt: IsNull() },
      { exitedAt: new Date() },
    );
    await manager.save(
      manager.create(BatchStageEvent, {
        batchId: batch.id,
        stage: next,
        actorUserId,
        notes: notes ?? null,
      }),
    );
    batch.currentStage = next;
    batch.readyAt = next === BatchStage.READY ? new Date() : null;
    await manager.save(batch);
  }

  /**
   * After a batch reaches READY, for each distinct parent ticket of its items:
   * if every item of that ticket is in a READY batch, transition the ticket
   * IN_PRODUCTION -> READY (and auto-close if fully paid).
   */
  private async deriveTicketReadiness(
    manager: EntityManager,
    orgId: string,
    batchId: string,
    actorUserId: string,
  ): Promise<TicketTransitionEvent[]> {
    const rows = await manager
      .createQueryBuilder(TicketItem, 'i')
      .select('DISTINCT i.ticketId', 'ticketId')
      .where('i.batchId = :batchId', { batchId })
      .getRawMany<{ ticketId: string }>();

    const events: TicketTransitionEvent[] = [];
    for (const { ticketId } of rows) {
      const incomplete = await manager
        .createQueryBuilder(TicketItem, 'i')
        .leftJoin(Batch, 'b', 'b.id = i.batchId')
        .where('i.ticketId = :ticketId', { ticketId })
        .andWhere('(i.batchId IS NULL OR b.currentStage != :ready)', {
          ready: BatchStage.READY,
        })
        .getCount();

      if (incomplete === 0) {
        const evt = await this.ticketsService.markReadyFromProduction(
          manager,
          orgId,
          ticketId,
          actorUserId,
        );
        if (evt) events.push(evt);
      }
    }
    return events;
  }

  /** Emit collected ticket transition events after the batch txn committed. */
  private emitEvents(events: TicketTransitionEvent[]): void {
    for (const evt of events) {
      this.eventEmitter.emit(TICKET_TRANSITION_EVENT, evt);
    }
  }

  private async nextBatchNumber(
    manager: EntityManager,
    shop: Shop,
  ): Promise<string> {
    const year = new Date().getFullYear();
    await manager
      .createQueryBuilder()
      .insert()
      .into(BatchCounter)
      .values({ orgId: shop.orgId, shopId: shop.id, year, lastSeq: 0 })
      .orIgnore()
      .execute();

    const counter = await manager.findOne(BatchCounter, {
      where: { shopId: shop.id, year },
      lock: { mode: 'pessimistic_write' },
    });
    if (!counter) {
      throw new BadRequestException('Failed to allocate batch number');
    }
    counter.lastSeq += 1;
    await manager.save(counter);

    const prefix = shop.code?.trim()
      ? shop.code.trim().toUpperCase()
      : (shop.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'SHP');
    return `${prefix}-B${year}-${String(counter.lastSeq).padStart(4, '0')}`;
  }
}
