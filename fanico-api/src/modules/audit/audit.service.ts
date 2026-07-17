import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AuditAction, AuditLog } from './entities/audit-log.entity';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';

export interface RecordAuditParams {
  orgId: string;
  actorUserId: string;
  actorRole: string;
  shopId: string | null;
  entityType: string;
  entityId: string | null;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  record(params: RecordAuditParams): Promise<AuditLog> {
    return this.repo.save(
      this.repo.create({
        orgId: params.orgId,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        shopId: params.shopId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        before: params.before ?? null,
        after: params.after ?? null,
        reason: params.reason ?? null,
        ip: params.ip ?? null,
      }),
    );
  }

  async list(
    orgId: string,
    query: ListAuditQueryDto,
  ): Promise<{
    data: AuditLog[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: FindOptionsWhere<AuditLog> = { orgId };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from && query.to) {
      where.at = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.at = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.at = LessThan(new Date(query.to));
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }
}
