import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationChannel,
  NotificationRecipientType,
  NotificationStatus,
} from './entities/notification.entity';

describe('NotificationsService.enqueue', () => {
  let repo: { create: jest.Mock; save: jest.Mock };
  let config: { get: jest.Mock };
  let service: NotificationsService;

  const params = {
    orgId: 'org-1',
    eventType: 'ticket.ready',
    recipientType: NotificationRecipientType.CUSTOMER,
    recipientId: 'cust-1',
    payload: { ticketNumber: 'PLT-2026-0001' },
  };

  beforeEach(() => {
    repo = {
      create: jest.fn((v: Partial<Notification>) => v),
      save: jest.fn(async (v: Notification) => ({ id: v.id ?? 'notif-1', ...v })),
    };
    config = { get: jest.fn() };
    service = new NotificationsService(
      repo as unknown as Repository<Notification>,
      config as unknown as ConfigService,
    );
  });

  it('creates a queued row and marks it sent in dev (WhatsApp stub)', async () => {
    config.get.mockReturnValue(false); // WHATSAPP_ENABLED=false
    const result = await service.enqueue(params);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: NotificationStatus.QUEUED,
        channel: NotificationChannel.WHATSAPP,
        eventType: 'ticket.ready',
      }),
    );
    expect(result.status).toBe(NotificationStatus.SENT);
    expect(result.externalId).toMatch(/^wa_mock_/);
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  it('marks the row failed when the sender throws', async () => {
    config.get.mockReturnValue(true); // WHATSAPP_ENABLED=true but not wired -> throws
    const result = await service.enqueue(params);

    expect(result.status).toBe(NotificationStatus.FAILED);
    expect(result.failedReason).toContain('not wired');
    expect(result.sentAt).toBeFalsy();
  });
});
