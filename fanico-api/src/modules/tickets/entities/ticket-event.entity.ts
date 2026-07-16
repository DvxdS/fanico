import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Append-only audit trail for a ticket. Never updated or soft-deleted — one
 * row per meaningful event (transition, payment recorded, override, etc.).
 */
@Entity('ticket_events')
export class TicketEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  // e.g. committed, ready, pickup, payment_recorded, dispute_opened, override
  @Column({ type: 'varchar' })
  eventType: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'uuid' })
  actorUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at: Date;
}
