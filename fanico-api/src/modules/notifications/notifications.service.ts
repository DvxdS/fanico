import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  Notification,
  NotificationChannel,
  NotificationRecipientType,
  NotificationStatus,
} from './entities/notification.entity';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

export interface EnqueueParams {
  orgId: string;
  eventType: string;
  recipientType: NotificationRecipientType;
  recipientId: string;
  channel?: NotificationChannel;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create a queued notification and attempt delivery in-process.
   * TODO(full TDR): replace the inline processing with a BullMQ queue + worker.
   */
  async enqueue(params: EnqueueParams): Promise<Notification> {
    const channel = params.channel ?? NotificationChannel.WHATSAPP;
    const notification = await this.repo.save(
      this.repo.create({
        orgId: params.orgId,
        recipientType: params.recipientType,
        recipientId: params.recipientId,
        channel,
        eventType: params.eventType,
        payload: params.payload,
        status: NotificationStatus.QUEUED,
      }),
    );

    try {
      const externalId = await this.dispatch(channel, notification);
      notification.status = NotificationStatus.SENT;
      notification.externalId = externalId;
      notification.sentAt = new Date();
    } catch (err) {
      notification.status = NotificationStatus.FAILED;
      notification.failedReason = (err as Error).message;
      this.logger.warn(
        `Notification ${notification.id} failed: ${notification.failedReason}`,
      );
    }
    return this.repo.save(notification);
  }

  async list(
    orgId: string,
    query: ListNotificationsQueryDto,
  ): Promise<{
    data: Notification[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: FindOptionsWhere<Notification> = { orgId };
    if (query.eventType) where.eventType = query.eventType;
    if (query.status) where.status = query.status;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  private dispatch(
    channel: NotificationChannel,
    n: Notification,
  ): Promise<string> {
    if (channel === NotificationChannel.WHATSAPP) {
      return this.sendWhatsApp(n.recipientId, n.eventType, n.payload);
    }
    // SMS/email are not part of the Step 4 skeleton.
    this.logger.log(
      `[notifications] (dev) ${channel} -> ${n.recipientId} event=${n.eventType}`,
    );
    return Promise.resolve(`mock_${channel}_${Date.now()}`);
  }

  /**
   * WhatsApp Cloud API sender. Stubbed: logs in dev; when WHATSAPP_ENABLED is
   * true it would POST to Meta — not wired yet (external/parallel task).
   */
  private sendWhatsApp(
    to: string,
    templateName: string,
    params: Record<string, unknown>,
  ): Promise<string> {
    if (this.config.get<boolean>('whatsappEnabled')) {
      // TODO(full TDR): POST to the WhatsApp Cloud API with templateName/params.
      throw new Error(
        'WHATSAPP_ENABLED=true but the Meta WhatsApp integration is not wired yet',
      );
    }
    this.logger.log(
      `[notifications] (dev) WhatsApp -> ${to} template=${templateName} params=${JSON.stringify(params)}`,
    );
    return Promise.resolve(`wa_mock_${Date.now()}`);
  }
}
