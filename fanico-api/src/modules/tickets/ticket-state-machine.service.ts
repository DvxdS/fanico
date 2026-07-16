import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketItem } from './entities/ticket-item.entity';
import {
  PhotoContext,
  TicketPhoto,
} from './entities/ticket-photo.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { InvalidTicketTransitionException } from '../../common/exceptions/invalid-ticket-transition.exception';
import { PaymentsService } from '../payments/payments.service';

/**
 * Single source of truth for legal ticket transitions. Every method operates
 * inside a caller-provided transaction (EntityManager), validates the current
 * status + guard conditions, mutates the ticket, persists it, and appends a
 * TicketEvent. Illegal transitions throw InvalidTicketTransitionException.
 */
@Injectable()
export class TicketStateMachineService {
  constructor(private readonly paymentsService: PaymentsService) {}

  async commit(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
  ): Promise<Ticket> {
    this.assertFrom(ticket, [TicketStatus.DRAFT], TicketStatus.OPEN);

    const itemCount = await manager.count(TicketItem, {
      where: { ticketId: ticket.id },
    });
    if (itemCount < 1) {
      throw new InvalidTicketTransitionException(
        ticket.status,
        TicketStatus.OPEN,
        'ticket needs at least one item',
      );
    }
    const overviewPhotos = await manager.count(TicketPhoto, {
      where: { ticketId: ticket.id, context: PhotoContext.INTAKE_OVERVIEW },
    });
    if (overviewPhotos < 1) {
      throw new InvalidTicketTransitionException(
        ticket.status,
        TicketStatus.OPEN,
        'ticket needs an intake_overview photo',
      );
    }

    ticket.openedByUserId = actorUserId;
    return this.apply(manager, ticket, TicketStatus.OPEN, actorUserId, 'committed');
  }

  async toProduction(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
  ): Promise<Ticket> {
    // Interim manual transition (Step 3 drives this from batching).
    this.assertFrom(ticket, [TicketStatus.OPEN], TicketStatus.IN_PRODUCTION);
    return this.apply(
      manager,
      ticket,
      TicketStatus.IN_PRODUCTION,
      actorUserId,
      'sent_to_production',
    );
  }

  async markReady(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
  ): Promise<Ticket> {
    // Interim manual transition (Step 3 replaces with batch-derived auto-ready).
    this.assertFrom(ticket, [TicketStatus.IN_PRODUCTION], TicketStatus.READY);
    return this.apply(manager, ticket, TicketStatus.READY, actorUserId, 'ready');
  }

  async close(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
  ): Promise<Ticket> {
    this.assertFrom(
      ticket,
      [TicketStatus.READY, TicketStatus.PARTIALLY_CLOSED],
      TicketStatus.CLOSED,
    );

    const paid = await this.paymentsService.sumForTicket(manager, ticket.id);
    if (paid !== ticket.totalXof) {
      throw new InvalidTicketTransitionException(
        ticket.status,
        TicketStatus.CLOSED,
        `payments (${paid}) do not equal total (${ticket.totalXof})`,
      );
    }

    ticket.closedByUserId = actorUserId;
    ticket.pickedUpAt = new Date();
    return this.apply(manager, ticket, TicketStatus.CLOSED, actorUserId, 'closed');
  }

  async closeOnCredit(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
    reason: string,
  ): Promise<Ticket> {
    this.assertFrom(
      ticket,
      [TicketStatus.READY],
      TicketStatus.PARTIALLY_CLOSED,
    );
    if (!reason?.trim()) {
      throw new InvalidTicketTransitionException(
        ticket.status,
        TicketStatus.PARTIALLY_CLOSED,
        'a reason is required',
      );
    }
    return this.apply(
      manager,
      ticket,
      TicketStatus.PARTIALLY_CLOSED,
      actorUserId,
      'closed_on_credit',
      { reason },
    );
  }

  async cancel(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
    reason?: string,
  ): Promise<Ticket> {
    this.assertFrom(ticket, [TicketStatus.OPEN], TicketStatus.CANCELLED);
    return this.apply(
      manager,
      ticket,
      TicketStatus.CANCELLED,
      actorUserId,
      'cancelled',
      reason ? { reason } : {},
    );
  }

  async dispute(
    manager: EntityManager,
    ticket: Ticket,
    actorUserId: string,
    reason: string,
  ): Promise<Ticket> {
    const disallowed: TicketStatus[] = [
      TicketStatus.CLOSED,
      TicketStatus.ARCHIVED,
      TicketStatus.DISPUTED,
    ];
    if (disallowed.includes(ticket.status)) {
      throw new InvalidTicketTransitionException(
        ticket.status,
        TicketStatus.DISPUTED,
      );
    }
    if (!reason?.trim()) {
      throw new InvalidTicketTransitionException(
        ticket.status,
        TicketStatus.DISPUTED,
        'a reason is required',
      );
    }
    return this.apply(
      manager,
      ticket,
      TicketStatus.DISPUTED,
      actorUserId,
      'dispute_opened',
      { reason },
    );
  }

  // --- helpers -------------------------------------------------------------

  private assertFrom(
    ticket: Ticket,
    allowedFrom: TicketStatus[],
    to: TicketStatus,
  ): void {
    if (!allowedFrom.includes(ticket.status)) {
      throw new InvalidTicketTransitionException(ticket.status, to);
    }
  }

  private async apply(
    manager: EntityManager,
    ticket: Ticket,
    to: TicketStatus,
    actorUserId: string,
    eventType: string,
    extraPayload: Record<string, unknown> = {},
  ): Promise<Ticket> {
    const from = ticket.status;
    ticket.status = to;
    const saved = await manager.save(Ticket, ticket);

    await manager.insert(TicketEvent, {
      ticketId: ticket.id,
      eventType,
      payload: { from, to, ...extraPayload },
      actorUserId,
    });

    return saved;
  }
}
