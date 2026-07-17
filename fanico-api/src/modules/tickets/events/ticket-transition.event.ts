import { TicketStatus } from '../entities/ticket.entity';

export const TICKET_TRANSITION_EVENT = 'ticket.transition';

/**
 * Emitted (after the DB transaction commits) whenever a ticket changes status.
 * Consumed by the notifications listener; carries everything the listener needs
 * so it doesn't have to re-query.
 */
export interface TicketTransitionEvent {
  orgId: string;
  ticketId: string;
  customerId: string;
  ticketNumber: string;
  before: TicketStatus;
  after: TicketStatus;
}
