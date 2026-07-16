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

export enum ServiceCategory {
  WASH = 'wash',
  IRON_ONLY = 'iron_only',
  DRY_CLEAN = 'dry_clean',
  SPECIAL = 'special',
}

export enum ServiceUnit {
  ITEM = 'item',
  KG = 'kg',
  SET = 'set',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orgId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: ServiceCategory })
  category: ServiceCategory;

  @Column({ type: 'enum', enum: ServiceUnit })
  unit: ServiceUnit;

  @Column({ type: 'integer' })
  basePriceXof: number;

  @Column({ type: 'integer', default: 48 })
  defaultLeadHours: number;

  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.ACTIVE })
  status: ServiceStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
