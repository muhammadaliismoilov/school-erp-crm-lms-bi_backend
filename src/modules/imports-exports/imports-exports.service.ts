import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDataJobDto, UpdateDataJobDto } from './dto/imports-exports.dto';
import { DataJob } from './entities/data-job.entity';
import { DataEntityType, DataJobStatus, DataJobType } from './enums/imports-exports.enums';

@Injectable()
export class ImportsExportsService {
  constructor(@InjectRepository(DataJob) private readonly jobs: Repository<DataJob>) {}
  findJobs(type?: DataJobType, entityType?: DataEntityType) { return this.jobs.find({ where: { ...(type ? { type } : {}), ...(entityType ? { entityType } : {}) }, order: { createdAt: 'DESC' } }); }
  createJob(dto: CreateDataJobDto) { return this.jobs.save(this.jobs.create(dto)); }
  async updateJob(id: string, dto: UpdateDataJobDto) { const entity = await this.jobs.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Data job not found'); return this.jobs.save(entity); }
  async markFailed(id: string, error: string) { return this.updateJob(id, { status: DataJobStatus.FAILED, failedRows: 1, errorReport: [{ row: null, error }] }); }
}
