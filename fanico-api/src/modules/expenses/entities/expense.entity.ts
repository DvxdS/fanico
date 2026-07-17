import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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
import { PaymentMethod } from '../../payments/entities/payment-record.entity';

export enum ExpenseCategory {
  WATER = 'water',
  ELECTRICITY = 'electricity',
  DETERGENT_SOFTENER = 'detergent_softener',
  CONSUMABLES_OTHER = 'consumables_other',
  SALARIES = 'salaries',
  RENT = 'rent',
  FUEL_TRANSPORT = 'fuel_transport',
  EQUIPMENT_MAINTENANCE = 'equipment_maintenance',
  MARKETING = 'marketing',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orgId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  // null = org-wide expense (e.g. a shared purchase).
  @Index()
  @Column({ type: 'uuid', nullable: true })
  shopId: string | null;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'shopId' })
  shop: Shop | null;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'integer' })
  amountXof: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  vendor: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoPath: string | null;

  @Column({ type: 'uuid' })
  recordedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recordedByUserId' })
  recordedByUser: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
