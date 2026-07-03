import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateTimesheetDto, TimesheetQueryDto, UpdateTimesheetDto } from './dto/timesheet.dto';
import { TimesheetService } from './timesheet.service';

@ApiTags('HR Timesheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/timesheets', version: '1' })
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  @Get() @Permissions([AppPermission.HR_TIMESHEETS_READ]) find(@Query() query: TimesheetQueryDto) { return this.timesheetService.findTimesheets(query); }
  @Get(':id') @Permissions([AppPermission.HR_TIMESHEETS_READ]) get(@Param() p: UuidParamDto) { return this.timesheetService.getTimesheet(p.id); }
  @Post() @Permissions([AppPermission.HR_TIMESHEETS_CREATE]) create(@Body() dto: CreateTimesheetDto) { return this.timesheetService.createTimesheet(dto); }
  @Patch(':id/submit') @Permissions([AppPermission.HR_TIMESHEETS_UPDATE]) submit(@Param() p: UuidParamDto) { return this.timesheetService.submitTimesheet(p.id); }
  @Patch(':id/approve') @Permissions([AppPermission.HR_TIMESHEETS_UPDATE]) approve(@Param() p: UuidParamDto) { return this.timesheetService.approveTimesheet(p.id); }
  @Patch(':id') @Permissions([AppPermission.HR_TIMESHEETS_UPDATE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateTimesheetDto) { return this.timesheetService.updateTimesheet(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_TIMESHEETS_DELETE]) remove(@Param() p: UuidParamDto) { return this.timesheetService.removeTimesheet(p.id); }
}
