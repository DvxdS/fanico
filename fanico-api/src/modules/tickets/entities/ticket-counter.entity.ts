import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Internal per-(shop, year) sequence backing human-readable ticket numbers.
 * Incremented under a pessimistic row lock inside the ticket-create
 * transaction to guarantee gap-free, race-free numbering.
 */
@Entity('ticket_counters')
@Unique('UQ_ticket_counter_shop_year', ['shopId', 'year'])
export class TicketCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shopId: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer', default: 0 })
  lastSeq: number;
}
