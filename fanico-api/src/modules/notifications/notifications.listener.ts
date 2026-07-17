import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationRecipientType } from './entities/notification.entity';
import { TicketStatus } from '../tickets/entities/ticket.entity';
import { TICKET_TRANSITION_EVENT } from '../tickets/events/ticket-transition.event';
import type { TicketTransitionEvent } from '../tickets/events/ticket-transition.event';

const PRE_READY: TicketStatus[] = [
  TicketStatus.DRAFT,
  TicketStatus.OPEN,
  TicketStatus.IN_PRODUCTION,
];

@Injectable()
export class NotificationsListener {
  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(TICKET_TRANSITION_EVENT)
  async onTicketTransition(event: TicketTransitionEvent): Promise<void> {
    const basePayload = {
      ticketId: event.ticketId,
      ticketNumber: event.ticketNumber,
      status: event.after,
    };

    // ticket.ready — when it reaches READY, or passes straight through to CLOSED
    // from a pre-ready state (prepaid ticket auto-closed on becoming ready).
    const reachedReady =
      event.after === TicketStatus.READY ||
      (event.after === TicketStatus.CLOSED && PRE_READY.includes(event.before));
    if (reachedReady) {
      await this.notifications.enqueue({
        orgId: event.orgId,
        eventType: 'ticket.ready',
        recipientType: NotificationRecipientType.CUSTOMER,
        recipientId: event.customerId,
        payload: basePayload,
      });
    }

    if (event.after === TicketStatus.CLOSED) {
      await this.notifications.enqueue({
        orgId: event.orgId,
        eventType: 'ticket.closed',
        recipientType: NotificationRecipientType.CUSTOMER,
        recipientId: event.customerId,
        payload: basePayload,
      });
    }
  }
}
