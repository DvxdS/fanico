import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import {
  TICKET_TRANSITION_EVENT,
  TicketTransitionEvent,
} from './events/ticket-transition.event';
import { TicketItem } from './entities/ticket-item.entity';
import { TicketPhoto } from './entities/ticket-photo.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketCounter } from './entities/ticket-counter.entity';
import { TicketStateMachineService } from './ticket-state-machine.service';
import { Shop } from '../shops/entities/shop.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Service } from '../catalog/entities/service.entity';
import { ShopPriceOverride } from '../catalog/entities/shop-price-override.entity';
import { PaymentRecord } from '../payments/entities/payment-record.entity';
import { PaymentsService } from '../payments/payments.service';
import { CreateTicketDto, CreateTicketItemDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddTicketItemDto } from './dto/add-ticket-item.dto';
import { AddTicketPhotoDto } from './dto/add-ticket-photo.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { RecordPaymentsDto } from '../payments/dto/record-payment.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly dataSource: DataSource,
    private readonly stateMachine: TicketStateMachineService,
    private readonly paymentsService: PaymentsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- creation & DRAFT edits ---------------------------------------------

  async create(
    orgId: string,
    actorUserId: string,
    dto: CreateTicketDto,
  ): Promise<Ticket> {
    const id = await this.dataSource.transaction(async (manager) => {
      const shop = await manager.findOne(Shop, {
        where: { id: dto.shopId, orgId },
      });
      if (!shop) {
        throw new BadRequestException('Shop not found in this organization');
      }
      const customer = await manager.findOne(Customer, {
        where: { id: dto.customerId, orgId },
      });
      if (!customer) {
        throw new BadRequestException('Customer not found in this organization');
      }

      const ticketNumber = await this.nextTicketNumber(manager, shop);

      const ticket = await manager.save(
        manager.create(Ticket, {
          orgId,
          shopId: dto.shopId,
          customerId: dto.customerId,
          ticketNumber,
          status: TicketStatus.DRAFT,
          totalXof: 0,
          paidXof: 0,
          promisedPickupAt: dto.promisedPickupAt
            ? new Date(dto.promisedPickupAt)
            : null,
          notes: dto.notes ?? null,
        }),
      );

      if (dto.items?.length) {
        for (const itemDto of dto.items) {
          await this.insertItem(manager, orgId, ticket, itemDto);
        }
        await this.recomputeTotal(manager, ticket.id);
      }

      return ticket.id;
    });

    return this.findOne(orgId, id);
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateTicketDto,
  ): Promise<Ticket> {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await this.loadOrFail(manager, orgId, id);
      this.assertDraft(ticket);
      if (dto.promisedPickupAt !== undefined) {
        ticket.promisedPickupAt = dto.promisedPickupAt
          ? new Date(dto.promisedPickupAt)
          : null;
      }
      if (dto.notes !== undefined) {
        ticket.notes = dto.notes;
      }
      await manager.save(ticket);
      return this.findOneWithin(manager, orgId, id);
    });
  }

  async addItem(
    orgId: string,
    id: string,
    dto: AddTicketItemDto,
  ): Promise<Ticket> {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await this.loadOrFail(manager, orgId, id);
      this.assertDraft(ticket);
      await this.insertItem(manager, orgId, ticket, dto);
      await this.recomputeTotal(manager, ticket.id);
      return this.findOneWithin(manager, orgId, id);
    });
  }

  async addPhoto(
    orgId: string,
    id: string,
    actorUserId: string,
    dto: AddTicketPhotoDto,
  ): Promise<TicketPhoto> {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await this.loadOrFail(manager, orgId, id);
      const insert = await manager.save(
        manager.create(TicketPhoto, {
          ticketId: ticket.id,
          storagePath: dto.storagePath,
          context: dto.context,
          caption: dto.caption ?? null,
          uploadedByUserId: actorUserId,
        }),
      );
      return insert;
    });
  }

  // --- transitions ---------------------------------------------------------

  commit(orgId: string, id: string, actorUserId: string): Promise<Ticket> {
    return this.transition(orgId, id, (m, t) =>
      this.stateMachine.commit(m, t, actorUserId),
    );
  }

  toProduction(orgId: string, id: string, actorUserId: string): Promise<Ticket> {
    return this.transition(orgId, id, (m, t) =>
      this.stateMachine.toProduction(m, t, actorUserId),
    );
  }

  async markReady(
    orgId: string,
    id: string,
    actorUserId: string,
  ): Promise<Ticket> {
    let evt: TicketTransitionEvent | null = null;
    await this.dataSource.transaction(async (manager) => {
      const ticket = await this.loadOrFail(manager, orgId, id);
      const before = ticket.status;
      await this.stateMachine.markReady(manager, ticket, actorUserId);
      // A ticket paid in full up front (deposit while OPEN) should close as
      // soon as it is ready — not wait for a further payment event.
      await this.maybeAutoClose(manager, ticket, actorUserId);
      evt = this.buildEvent(orgId, ticket, before);
    });
    this.emitTransition(evt);
    return this.findOne(orgId, id);
  }

  cancel(
    orgId: string,
    id: string,
    actorUserId: string,
    reason?: string,
  ): Promise<Ticket> {
    return this.transition(orgId, id, (m, t) =>
      this.stateMachine.cancel(m, t, actorUserId, reason),
    );
  }

  dispute(
    orgId: string,
    id: string,
    actorUserId: string,
    reason: string,
  ): Promise<Ticket> {
    return this.transition(orgId, id, (m, t) =>
      this.stateMachine.dispute(m, t, actorUserId, reason),
    );
  }

  closeOnCredit(
    orgId: string,
    id: string,
    actorUserId: string,
    reason: string,
  ): Promise<Ticket> {
    return this.transition(orgId, id, (m, t) =>
      this.stateMachine.closeOnCredit(m, t, actorUserId, reason),
    );
  }

  async recordPayments(
    orgId: string,
    id: string,
    actorUserId: string,
    dto: RecordPaymentsDto,
  ): Promise<Ticket> {
    let evt: TicketTransitionEvent | null = null;
    const result = await this.dataSource.transaction(async (manager) => {
      const ticket = await this.loadOrFail(manager, orgId, id);
      const before = ticket.status;

      const blocked: TicketStatus[] = [
        TicketStatus.DRAFT,
        TicketStatus.CANCELLED,
        TicketStatus.ARCHIVED,
      ];
      if (blocked.includes(ticket.status)) {
        throw new BadRequestException(
          `Cannot record a payment for a ${ticket.status} ticket`,
        );
      }

      for (const p of dto.payments) {
        await manager.insert(PaymentRecord, {
          ticketId: ticket.id,
          method: p.method,
          amountXof: p.amountXof,
          externalReference: p.externalReference ?? null,
          notes: p.notes ?? null,
          recordedByUserId: actorUserId,
        });
      }

      await manager.insert(TicketEvent, {
        ticketId: ticket.id,
        eventType: 'payment_recorded',
        payload: {
          count: dto.payments.length,
          totalRecordedXof: dto.payments.reduce((s, p) => s + p.amountXof, 0),
          methods: dto.payments.map((p) => p.method),
        },
        actorUserId,
      });

      const paid = await this.paymentsService.sumForTicket(manager, ticket.id);
      ticket.paidXof = paid;
      await manager.save(ticket);

      await this.maybeAutoClose(manager, ticket, actorUserId);
      evt = this.buildEvent(orgId, ticket, before);

      return this.findOneWithin(manager, orgId, id);
    });
    this.emitTransition(evt);
    return result;
  }

  // --- production integration (called within a batch transaction) ----------

  /**
   * Move a ticket OPEN -> IN_PRODUCTION when its items are first batched.
   * No-op if the ticket is not OPEN. Runs inside the caller's transaction.
   */
  async moveToProductionFromBatch(
    manager: EntityManager,
    orgId: string,
    ticketId: string,
    actorUserId: string,
  ): Promise<TicketTransitionEvent | null> {
    const ticket = await manager.findOne(Ticket, {
      where: { id: ticketId, orgId },
    });
    if (ticket && ticket.status === TicketStatus.OPEN) {
      const before = ticket.status;
      await this.stateMachine.toProduction(manager, ticket, actorUserId);
      return this.buildEvent(orgId, ticket, before);
    }
    return null;
  }

  /**
   * Move a ticket IN_PRODUCTION -> READY once production reports all its items
   * ready, then auto-close if already fully paid. No-op unless IN_PRODUCTION.
   * Runs inside the caller's transaction. Returns the transition event (for the
   * caller to emit after commit) or null if nothing changed.
   */
  async markReadyFromProduction(
    manager: EntityManager,
    orgId: string,
    ticketId: string,
    actorUserId: string,
  ): Promise<TicketTransitionEvent | null> {
    const ticket = await manager.findOne(Ticket, {
      where: { id: ticketId, orgId },
    });
    if (ticket && ticket.status === TicketStatus.IN_PRODUCTION) {
      const before = ticket.status;
      await this.stateMachine.markReady(manager, ticket, actorUserId);
      await this.maybeAutoClose(manager, ticket, actorUserId);
      return this.buildEvent(orgId, ticket, before);
    }
    return null;
  }

  // --- reads ---------------------------------------------------------------

  async findAll(
    orgId: string,
    query: ListTicketsQueryDto,
  ): Promise<{ data: Ticket[]; total: number; limit: number; offset: number }> {
    const where: FindOptionsWhere<Ticket> = { orgId };
    if (query.status) where.status = query.status;
    if (query.shopId) where.shopId = query.shopId;
    if (query.from && query.to) {
      where.createdAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.createdAt = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.createdAt = LessThan(new Date(query.to));
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.ticketRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOne(orgId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id, orgId },
      relations: { items: true, photos: true, payments: true, events: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async findByNumber(orgId: string, ticketNumber: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { orgId, ticketNumber },
      relations: { items: true, photos: true, payments: true, events: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  // --- internals -----------------------------------------------------------

  private async transition(
    orgId: string,
    id: string,
    fn: (manager: EntityManager, ticket: Ticket) => Promise<Ticket>,
  ): Promise<Ticket> {
    let evt: TicketTransitionEvent | null = null;
    await this.dataSource.transaction(async (manager) => {
      const ticket = await this.loadOrFail(manager, orgId, id);
      const before = ticket.status;
      await fn(manager, ticket);
      evt = this.buildEvent(orgId, ticket, before);
    });
    this.emitTransition(evt);
    return this.findOne(orgId, id);
  }

  /** Build a transition event if the status actually changed, else null. */
  private buildEvent(
    orgId: string,
    ticket: Ticket,
    before: TicketStatus,
  ): TicketTransitionEvent | null {
    if (ticket.status === before) {
      return null;
    }
    return {
      orgId,
      ticketId: ticket.id,
      customerId: ticket.customerId,
      ticketNumber: ticket.ticketNumber,
      before,
      after: ticket.status,
    };
  }

  /** Emit a ticket transition after its transaction has committed. */
  private emitTransition(evt: TicketTransitionEvent | null): void {
    if (evt) {
      this.eventEmitter.emit(TICKET_TRANSITION_EVENT, evt);
    }
  }

  /**
   * Close the ticket automatically when it is fully paid and in a closeable
   * state (READY or PARTIALLY_CLOSED). Mutates `ticket` in place. Safe to call
   * from either the payment flow or the moment a ticket becomes READY.
   */
  private async maybeAutoClose(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
  ): Promise<void> {
    const closeable =
      ticket.status === TicketStatus.READY ||
      ticket.status === TicketStatus.PARTIALLY_CLOSED;
    if (!closeable) {
      return;
    }
    const paid = await this.paymentsService.sumForTicket(manager, ticket.id);
    if (paid === ticket.totalXof) {
      await this.stateMachine.close(manager, ticket, actorUserId);
    }
  }

  private async loadOrFail(
    manager: EntityManager,
    orgId: string,
    id: string,
  ): Promise<Ticket> {
    const ticket = await manager.findOne(Ticket, { where: { id, orgId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  private findOneWithin(
    manager: EntityManager,
    orgId: string,
    id: string,
  ): Promise<Ticket> {
    return manager
      .findOneOrFail(Ticket, {
        where: { id, orgId },
        relations: { items: true, photos: true, payments: true, events: true },
      })
      .catch(() => {
        throw new NotFoundException('Ticket not found');
      });
  }

  private assertDraft(ticket: Ticket): void {
    if (ticket.status !== TicketStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT tickets can be edited (current status: ${ticket.status})`,
      );
    }
  }

  private async insertItem(
    manager: EntityManager,
    orgId: string,
    ticket: Ticket,
    dto: CreateTicketItemDto,
  ): Promise<void> {
    const service = await manager.findOne(Service, {
      where: { id: dto.serviceId, orgId },
    });
    if (!service) {
      throw new BadRequestException('Service not found in this organization');
    }

    let unitPriceXof = dto.unitPriceXof;
    if (unitPriceXof === undefined) {
      const override = await manager.findOne(ShopPriceOverride, {
        where: { shopId: ticket.shopId, serviceId: service.id },
      });
      unitPriceXof = override ? override.basePriceXof : service.basePriceXof;
    }

    const lineTotalXof = unitPriceXof * dto.quantity;
    await manager.save(
      manager.create(TicketItem, {
        ticketId: ticket.id,
        serviceId: service.id,
        quantity: dto.quantity,
        unitPriceXof,
        modifiers: dto.modifiers ?? null,
        lineTotalXof,
      }),
    );
  }

  private async recomputeTotal(
    manager: EntityManager,
    ticketId: string,
  ): Promise<void> {
    const raw = await manager
      .createQueryBuilder(TicketItem, 'i')
      .select('COALESCE(SUM(i.lineTotalXof), 0)', 'sum')
      .where('i.ticketId = :ticketId', { ticketId })
      .getRawOne<{ sum: string }>();
    await manager.update(Ticket, { id: ticketId }, {
      totalXof: Number(raw?.sum ?? 0),
    });
  }

  private async nextTicketNumber(
    manager: EntityManager,
    shop: Shop,
  ): Promise<string> {
    const year = new Date().getFullYear();

    // Ensure a counter row exists, then lock it for a race-free increment.
    await manager
      .createQueryBuilder()
      .insert()
      .into(TicketCounter)
      .values({ shopId: shop.id, year, lastSeq: 0 })
      .orIgnore()
      .execute();

    const counter = await manager.findOne(TicketCounter, {
      where: { shopId: shop.id, year },
      lock: { mode: 'pessimistic_write' },
    });
    if (!counter) {
      throw new BadRequestException('Failed to allocate ticket number');
    }
    counter.lastSeq += 1;
    await manager.save(counter);

    const prefix = this.shopCode(shop);
    return `${prefix}-${year}-${String(counter.lastSeq).padStart(4, '0')}`;
  }

  private shopCode(shop: Shop): string {
    if (shop.code?.trim()) {
      return shop.code.trim().toUpperCase();
    }
    const derived = shop.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase();
    return derived || 'SHP';
  }
}
