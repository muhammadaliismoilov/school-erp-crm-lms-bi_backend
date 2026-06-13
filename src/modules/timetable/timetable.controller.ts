import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateTimetableTemplateDto, UpdateTimetableTemplateDto, CreateTimetableSlotDto, UpdateTimetableSlotDto, CreateTimetableSubstitutionDto, UpdateTimetableSubstitutionDto, CreateTimetableConflictDto, UpdateTimetableConflictDto } from './dto/timetable.dto';
import { TimetableService } from './timetable.service';

@ApiTags('Timetable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'timetable', version: '1' })
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  @Get('templates')
  @Permissions([AppPermission.TIMETABLE_READ])
  findTemplates() { return this.service.findTemplates(); }

  @Post('templates')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  createTemplates(@Body() dto: CreateTimetableTemplateDto) { return this.service.createTemplates(dto); }

  @Patch('templates/:id')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  updateTemplates(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableTemplateDto) { return this.service.updateTemplates(params.id, dto); }

  @Get('slots')
  @Permissions([AppPermission.TIMETABLE_READ])
  findSlots() { return this.service.findSlots(); }

  @Post('slots')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  createSlots(@Body() dto: CreateTimetableSlotDto) { return this.service.createSlots(dto); }

  @Patch('slots/:id')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  updateSlots(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableSlotDto) { return this.service.updateSlots(params.id, dto); }

  @Get('substitutions')
  @Permissions([AppPermission.TIMETABLE_READ])
  findSubstitutions() { return this.service.findSubstitutions(); }

  @Post('substitutions')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  createSubstitutions(@Body() dto: CreateTimetableSubstitutionDto) { return this.service.createSubstitutions(dto); }

  @Patch('substitutions/:id')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  updateSubstitutions(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableSubstitutionDto) { return this.service.updateSubstitutions(params.id, dto); }

  @Get('conflicts')
  @Permissions([AppPermission.TIMETABLE_READ])
  findConflicts() { return this.service.findConflicts(); }

  @Post('conflicts')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  createConflicts(@Body() dto: CreateTimetableConflictDto) { return this.service.createConflicts(dto); }

  @Patch('conflicts/:id')
  @Permissions([AppPermission.TIMETABLE_MANAGE])
  updateConflicts(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableConflictDto) { return this.service.updateConflicts(params.id, dto); }
}
