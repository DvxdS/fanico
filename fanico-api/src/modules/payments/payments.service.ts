import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentMethod, PaymentRecord } from './entities/payment-record.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

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

  /**
   * Sum of CASH payments recorded within [from, to] against tickets belonging
   * to the given shop. Used to compute a cash drawer's expected amount.
   */
  async sumCashForShopBetween(
    manager: EntityManager,
    shopId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const raw = await manager
      .createQueryBuilder(PaymentRecord, 'p')
      .innerJoin(Ticket, 't', 't.id = p.ticketId')
      .select('COALESCE(SUM(p.amountXof), 0)', 'sum')
      .where('p.method = :method', { method: PaymentMethod.CASH })
      .andWhere('t.shopId = :shopId', { shopId })
      .andWhere('p.recordedAt BETWEEN :from AND :to', { from, to })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }
}
