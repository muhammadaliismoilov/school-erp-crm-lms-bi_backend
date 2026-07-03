import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AuditLog } from './entities/audit-log.entity';

interface AuditInput {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly tenant: TenantContextService,
  ) {}

  log(input: AuditInput): Promise<AuditLog> {
    return this.auditLogs.save(this.auditLogs.create(input));
  }

  /** Full audit trail for one entity record (oldest first), with the actor loaded. */
  findForEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogs.find({
      where: tenantWhere<AuditLog>(this.tenant, { entity, entityId }, { branch: true }),
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
  }
}
