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
import { User } from './user.entity';
import { Shop } from '../../shops/entities/shop.entity';

export enum Role {
  OWNER = 'OWNER',
  SHOP_MANAGER = 'SHOP_MANAGER',
  CASHIER = 'CASHIER',
  OPERATOR = 'OPERATOR',
  AUDITOR = 'AUDITOR',
}

@Entity('user_shop_roles')
export class UserShopRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // null => org-wide role (not scoped to a single shop)
  @Index()
  @Column({ type: 'uuid', nullable: true })
  shopId: string | null;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'shopId' })
  shop: Shop | null;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
