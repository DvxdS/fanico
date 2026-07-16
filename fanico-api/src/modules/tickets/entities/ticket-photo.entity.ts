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

export enum PhotoContext {
  INTAKE_OVERVIEW = 'intake_overview',
  INTAKE_DETAIL = 'intake_detail',
  QC = 'qc',
  DISPUTE = 'dispute',
}

@Entity('ticket_photos')
export class TicketPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  // Step 2: just the path/URL string. Actual file upload wiring is Step 4.
  @Column({ type: 'varchar' })
  storagePath: string;

  @Column({ type: 'enum', enum: PhotoContext })
  context: PhotoContext;

  @Column({ type: 'varchar', nullable: true })
  caption: string | null;

  @Column({ type: 'uuid' })
  uploadedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedByUser: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
