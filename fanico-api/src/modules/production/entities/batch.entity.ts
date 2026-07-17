import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../orgs/entities/organization.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';
import { Equipment } from './equipment.entity';

export enum BatchStage {
  WASHING = 'WASHING',
  DRYING = 'DRYING',
  IRONING = 'IRONING',
  QC = 'QC',
  READY = 'READY',
}

/** Ordered progression of production stages. */
export const BATCH_STAGE_ORDER: BatchStage[] = [
  BatchStage.WASHING,
  BatchStage.DRYING,
  BatchStage.IRONING,
  BatchStage.QC,
  BatchStage.READY,
];

@Entity('batches')
@Unique('UQ_batch_shop_number', ['shopId', 'batchNumber'])
export class Batch {
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

  @Column({ type: 'varchar' })
  batchNumber: string;

  // Free operator-chosen wash-program string, e.g. cotton_60, delicate_30.
  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'uuid', nullable: true })
  equipmentId: string | null;

  @ManyToOne(() => Equipment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'equipmentId' })
  equipment: Equipment | null;

  @Column({
    type: 'enum',
    enum: BatchStage,
    default: BatchStage.WASHING,
  })
  currentStage: BatchStage;

  @Column({ type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedToUser: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  readyAt: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
