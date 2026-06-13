import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateKpiMetricDto, CreateKpiResultDto, UpdateKpiMetricDto, UpdateKpiResultDto } from './dto/kpi.dto';
import { KpiService } from './kpi.service';
@ApiTags('KPI') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'kpi', version: '1' })
export class KpiController { constructor(private readonly service: KpiService) {}
  @Get('metrics') @Permissions([AppPermission.KPI_READ]) findMetrics() { return this.service.findMetrics(); }
  @Post('metrics') @Permissions([AppPermission.KPI_MANAGE]) createMetric(@Body() dto: CreateKpiMetricDto) { return this.service.createMetric(dto); }
  @Patch('metrics/:id') @Permissions([AppPermission.KPI_MANAGE]) updateMetric(@Param() p: UuidParamDto, @Body() dto: UpdateKpiMetricDto) { return this.service.updateMetric(p.id, dto); }
  @Get('results') @Permissions([AppPermission.KPI_READ]) findResults(@Query('targetId') targetId?: string) { return this.service.findResults(targetId); }
  @Post('results') @Permissions([AppPermission.KPI_MANAGE]) createResult(@Body() dto: CreateKpiResultDto) { return this.service.createResult(dto); }
  @Patch('results/:id') @Permissions([AppPermission.KPI_MANAGE]) updateResult(@Param() p: UuidParamDto, @Body() dto: UpdateKpiResultDto) { return this.service.updateResult(p.id, dto); }
}
