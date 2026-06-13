import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateKpiMetricDto, CreateKpiResultDto, UpdateKpiMetricDto, UpdateKpiResultDto } from './dto/kpi.dto';
import { KpiMetric } from './entities/kpi-metric.entity';
import { KpiResult } from './entities/kpi-result.entity';
@Injectable()
export class KpiService {
  constructor(@InjectRepository(KpiMetric) private metrics: Repository<KpiMetric>, @InjectRepository(KpiResult) private results: Repository<KpiResult>) {}
  findMetrics() { return this.metrics.find({ order: { createdAt: 'DESC' } }); }
  createMetric(dto: CreateKpiMetricDto) { return this.metrics.save(this.metrics.create(dto)); }
  async updateMetric(id: string, dto: UpdateKpiMetricDto) { const e = await this.metrics.preload({ id, ...dto }); if (!e) throw new NotFoundException('KPI metric not found'); return this.metrics.save(e); }
  findResults(targetId?: string) { return this.results.find({ where: targetId ? { targetId } : {}, order: { periodStart: 'DESC' } }); }
  createResult(dto: CreateKpiResultDto) { return this.results.save(this.results.create(dto)); }
  async updateResult(id: string, dto: UpdateKpiResultDto) { const e = await this.results.preload({ id, ...dto }); if (!e) throw new NotFoundException('KPI result not found'); return this.results.save(e); }
}
