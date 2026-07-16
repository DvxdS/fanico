import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A dumb record of a payment — method + amount + optional human-typed
 * reference. NEVER processes money; no gateway calls (spec ground rule #1).
 */
export enum PaymentMethod {
  CASH = 'CASH',
  WAVE = 'WAVE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  MTN_MOMO = 'MTN_MOMO',
  MOOV_MONEY = 'MOOV_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD_VISA_GIM = 'CARD_VISA_GIM',
  CHEQUE = 'CHEQUE',
  CREDIT = 'CREDIT',
}

@Entity('payment_records')
export class PaymentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'integer' })
  amountXof: number;

  // Free text typed by a human — never validated against a real payment API.
  @Column({ type: 'varchar', nullable: true })
  externalReference: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  recordedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recordedByUserId' })
  recordedByUser: User;

  @CreateDateColumn({ name: 'recordedAt', type: 'timestamptz' })
  recordedAt: Date;
}
