import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateKpiMetricDto, CreateKpiResultDto, UpdateKpiMetricDto, UpdateKpiResultDto } from './dto/kpi.dto';
import { KpiMetric } from './entities/kpi-metric.entity';
import { KpiResult } from './entities/kpi-result.entity';
@Injectable()
export class KpiService {
  constructor(@InjectRepository(KpiMetric) private metrics: Repository<KpiMetric>, @InjectRepository(KpiResult) private results: Repository<KpiResult>, private readonly tenant: TenantContextService) {}
  findMetrics() { return this.metrics.find({ where: tenantWhere<KpiMetric>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createMetric(dto: CreateKpiMetricDto) { return this.metrics.save(this.metrics.create(dto)); }
  async updateMetric(id: string, dto: UpdateKpiMetricDto) { const found = await this.metrics.findOne({ where: tenantWhere<KpiMetric>(this.tenant, { id }, { branch: true }) }); if (!found) throw new NotFoundException('KPI metric not found'); const e = await this.metrics.preload({ id, ...dto }); return this.metrics.save(e!); }
  findResults(targetId?: string) { return this.results.find({ where: tenantWhere<KpiResult>(this.tenant, targetId ? { targetId } : {}, { branch: true }), order: { periodStart: 'DESC' } }); }
  createResult(dto: CreateKpiResultDto) { return this.results.save(this.results.create(dto)); }
  async updateResult(id: string, dto: UpdateKpiResultDto) { const found = await this.results.findOne({ where: tenantWhere<KpiResult>(this.tenant, { id }, { branch: true }) }); if (!found) throw new NotFoundException('KPI result not found'); const e = await this.results.preload({ id, ...dto }); return this.results.save(e!); }
}
