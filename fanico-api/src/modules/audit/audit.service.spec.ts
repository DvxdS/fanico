import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditAction, AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  let repo: { create: jest.Mock; save: jest.Mock; findAndCount: jest.Mock };
  let service: AuditService;

  beforeEach(() => {
    repo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ id: 'audit-1', ...v })),
      findAndCount: jest.fn(async () => [[], 0]),
    };
    service = new AuditService(repo as unknown as Repository<AuditLog>);
  });

  it('records an audit entry with the given fields', async () => {
    const result = await service.record({
      orgId: 'org-1',
      actorUserId: 'user-1',
      actorRole: 'OWNER',
      shopId: null,
      entityType: 'ticket',
      entityId: 'ticket-1',
      action: AuditAction.TRANSITION,
      after: { status: 'CLOSED' },
      reason: 'paid',
      ip: '127.0.0.1',
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ticket',
        action: AuditAction.TRANSITION,
        after: { status: 'CLOSED' },
      }),
    );
    expect(result.id).toBe('audit-1');
  });

  it('lists audit entries scoped by orgId (paged)', async () => {
    const res = await service.list('org-1', { entityType: 'ticket' });
    expect(res).toEqual({ data: [], total: 0, limit: 20, offset: 0 });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: 'org-1', entityType: 'ticket' }),
      }),
    );
  });
});
