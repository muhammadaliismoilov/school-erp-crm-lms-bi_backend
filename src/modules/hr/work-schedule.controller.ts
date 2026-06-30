import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateWorkScheduleDto, UpdateWorkScheduleDto, WorkScheduleQueryDto } from './dto/work-schedule.dto';
import { WorkScheduleService } from './work-schedule.service';

@ApiTags('HR Work Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/work-schedules', version: '1' })
export class WorkScheduleController {
  constructor(private readonly scheduleService: WorkScheduleService) {}

  @Get() @Permissions([AppPermission.HR_READ]) find(@Query() query: WorkScheduleQueryDto) { return this.scheduleService.findSchedules(query); }
  @Get(':id') @Permissions([AppPermission.HR_READ]) get(@Param() p: UuidParamDto) { return this.scheduleService.getSchedule(p.id); }
  @Post() @Permissions([AppPermission.HR_MANAGE]) create(@Body() dto: CreateWorkScheduleDto) { return this.scheduleService.createSchedule(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_MANAGE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateWorkScheduleDto) { return this.scheduleService.updateSchedule(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_MANAGE]) remove(@Param() p: UuidParamDto) { return this.scheduleService.removeSchedule(p.id); }
}
