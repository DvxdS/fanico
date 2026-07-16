import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../orgs/entities/organization.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { TicketItem } from './ticket-item.entity';
import { TicketPhoto } from './ticket-photo.entity';
import { TicketEvent } from './ticket-event.entity';
import { PaymentRecord } from '../../payments/entities/payment-record.entity';

export enum TicketStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY = 'READY',
  CLOSED = 'CLOSED',
  PARTIALLY_CLOSED = 'PARTIALLY_CLOSED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('tickets')
@Unique('UQ_ticket_shop_number', ['shopId', 'ticketNumber'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orgId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Index()
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'varchar' })
  ticketNumber: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.DRAFT })
  status: TicketStatus;

  @Column({ type: 'integer', default: 0 })
  totalXof: number;

  @Column({ type: 'integer', default: 0 })
  paidXof: number;

  @Column({ type: 'timestamptz', nullable: true })
  promisedPickupAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  openedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'openedByUserId' })
  openedByUser: User | null;

  @Column({ type: 'uuid', nullable: true })
  closedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'closedByUserId' })
  closedByUser: User | null;

  @OneToMany(() => TicketItem, (item) => item.ticket)
  items: TicketItem[];

  @OneToMany(() => TicketPhoto, (photo) => photo.ticket)
  photos: TicketPhoto[];

  @OneToMany(() => TicketEvent, (event) => event.ticket)
  events: TicketEvent[];

  @OneToMany(() => PaymentRecord, (payment) => payment.ticket)
  payments: PaymentRecord[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
