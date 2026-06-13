import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  log(input: AuditInput): Promise<AuditLog> {
    return this.auditLogs.save(this.auditLogs.create(input));
  }
}
