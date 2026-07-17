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
import { Organization } from '../../orgs/entities/organization.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';

export enum CashDrawerStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  FLAGGED = 'flagged',
}

@Entity('cash_drawer_sessions')
// At most one OPEN session per cashier per shop (partial unique index).
@Index('UQ_cash_drawer_open_per_cashier_shop', ['shopId', 'cashierUserId'], {
  unique: true,
  where: `"status" = 'open'`,
})
export class CashDrawerSession {
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

  @Column({ type: 'uuid' })
  cashierUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cashierUserId' })
  cashierUser: User;

  @CreateDateColumn({ type: 'timestamptz' })
  openedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'integer' })
  startingAmountXof: number;

  @Column({ type: 'integer', nullable: true })
  endingAmountXof: number | null;

  @Column({ type: 'integer', nullable: true })
  expectedAmountXof: number | null;

  @Column({ type: 'integer', nullable: true })
  discrepancyXof: number | null;

  @Column({
    type: 'enum',
    enum: CashDrawerStatus,
    default: CashDrawerStatus.OPEN,
  })
  status: CashDrawerStatus;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
