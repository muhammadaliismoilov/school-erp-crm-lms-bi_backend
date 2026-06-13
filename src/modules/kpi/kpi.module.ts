import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiMetric } from './entities/kpi-metric.entity';
import { KpiResult } from './entities/kpi-result.entity';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';
@Module({ imports: [TypeOrmModule.forFeature([KpiMetric, KpiResult])], controllers: [KpiController], providers: [KpiService], exports: [KpiService] })
export class KpiModule {}
