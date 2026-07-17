import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Batch, BatchStage } from './batch.entity';
import { User } from '../../users/entities/user.entity';

/** Append-only trail of a batch moving through stages. */
@Entity('batch_stage_events')
export class BatchStageEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  batchId: string;

  @ManyToOne(() => Batch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch: Batch;

  @Column({ type: 'enum', enum: BatchStage })
  stage: BatchStage;

  @CreateDateColumn({ type: 'timestamptz' })
  enteredAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exitedAt: Date | null;

  @Column({ type: 'uuid' })
  actorUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;
}
