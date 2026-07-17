import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { Service } from '../../catalog/entities/service.entity';
import { Batch } from '../../production/entities/batch.entity';

@Entity('ticket_items')
export class TicketItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'serviceId' })
  service: Service;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'integer' })
  unitPriceXof: number;

  // Snapshot of modifiers at time of sale (free-form key/values).
  @Column({ type: 'jsonb', nullable: true })
  modifiers: Record<string, unknown> | null;

  @Column({ type: 'integer' })
  lineTotalXof: number;

  // null = unbatched (sitting on an OPEN ticket); set when added to a batch.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  batchId: string | null;

  @ManyToOne(() => Batch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'batchId' })
  batch: Batch | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
