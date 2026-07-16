import { BadRequestException } from '@nestjs/common';
import { TicketStatus } from '../../modules/tickets/entities/ticket.entity';

/**
 * Thrown when a ticket state transition is not permitted from the current
 * status (or a guard condition fails). Surfaces as HTTP 400 with a clear
 * message — never a silent no-op or 500 (spec ground rule #3).
 */
export class InvalidTicketTransitionException extends BadRequestException {
  constructor(from: TicketStatus, to: TicketStatus, reason?: string) {
    super(
      `Invalid ticket transition ${from} -> ${to}` +
        (reason ? `: ${reason}` : ''),
    );
  }
}
