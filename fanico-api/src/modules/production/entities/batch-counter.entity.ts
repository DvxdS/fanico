import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Internal per-(shop, year) sequence backing human-readable batch numbers.
 * Incremented under a pessimistic row lock inside the batch-create
 * transaction. Mirrors TicketCounter.
 */
@Entity('batch_counters')
@Unique('UQ_batch_counter_shop_year', ['shopId', 'year'])
export class BatchCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orgId: string;

  @Column({ type: 'uuid' })
  shopId: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer', default: 0 })
  lastSeq: number;
}
