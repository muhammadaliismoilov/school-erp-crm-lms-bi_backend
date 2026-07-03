import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateDataJobDto, UpdateDataJobDto } from './dto/imports-exports.dto';
import { DataEntityType, DataJobType } from './enums/imports-exports.enums';
import { ImportsExportsService } from './imports-exports.service';

@ApiTags('Imports / Exports') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'imports-exports', version: '1' })
export class ImportsExportsController { constructor(private readonly service: ImportsExportsService) {}
  @Get('jobs') @Permissions([AppPermission.DATA_JOBS_READ]) findJobs(@Query('type') type?: DataJobType, @Query('entityType') entityType?: DataEntityType) { return this.service.findJobs(type, entityType); }
  @Post('jobs') @Permissions([AppPermission.DATA_JOBS_CREATE]) createJob(@Body() dto: CreateDataJobDto) { return this.service.createJob(dto); }
  @Patch('jobs/:id') @Permissions([AppPermission.DATA_JOBS_UPDATE]) updateJob(@Param() p: UuidParamDto, @Body() dto: UpdateDataJobDto) { return this.service.updateJob(p.id, dto); }
}
