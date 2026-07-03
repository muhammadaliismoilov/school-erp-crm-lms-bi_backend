import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateDataJobDto, UpdateDataJobDto } from './dto/imports-exports.dto';
import { DataJob } from './entities/data-job.entity';
import { DataEntityType, DataJobStatus, DataJobType } from './enums/imports-exports.enums';

@Injectable()
export class ImportsExportsService {
  constructor(@InjectRepository(DataJob) private readonly jobs: Repository<DataJob>, private readonly tenant: TenantContextService) {}
  findJobs(type?: DataJobType, entityType?: DataEntityType) { return this.jobs.find({ where: tenantWhere<DataJob>(this.tenant, { ...(type ? { type } : {}), ...(entityType ? { entityType } : {}) }, { branch: true }), order: { createdAt: 'DESC' } }); }
  createJob(dto: CreateDataJobDto) { return this.jobs.save(this.jobs.create(dto)); }
  async updateJob(id: string, dto: UpdateDataJobDto) { const existing = await this.jobs.findOne({ where: tenantWhere<DataJob>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('Data job not found'); const entity = await this.jobs.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Data job not found'); return this.jobs.save(entity); }
  async markFailed(id: string, error: string) { return this.updateJob(id, { status: DataJobStatus.FAILED, failedRows: 1, errorReport: [{ row: null, error }] }); }
}
