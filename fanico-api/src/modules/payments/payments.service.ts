import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentRecord } from './entities/payment-record.entity';

@Injectable()
export class PaymentsService {
  /** Sum of all recorded payments for a ticket, within the given manager. */
  async sumForTicket(
    manager: EntityManager,
    ticketId: string,
  ): Promise<number> {
    const raw = await manager
      .createQueryBuilder(PaymentRecord, 'p')
      .select('COALESCE(SUM(p.amountXof), 0)', 'sum')
      .where('p.ticketId = :ticketId', { ticketId })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }
}
