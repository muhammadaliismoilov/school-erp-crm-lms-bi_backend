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
  @Permissions([AppPermission.TIMETABLE_TEMPLATES_READ])
  findTemplates() { return this.service.findTemplates(); }

  @Post('templates')
  @Permissions([AppPermission.TIMETABLE_TEMPLATES_CREATE])
  createTemplates(@Body() dto: CreateTimetableTemplateDto) { return this.service.createTemplates(dto); }

  @Patch('templates/:id')
  @Permissions([AppPermission.TIMETABLE_TEMPLATES_UPDATE])
  updateTemplates(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableTemplateDto) { return this.service.updateTemplates(params.id, dto); }

  @Get('slots')
  @Permissions([AppPermission.TIMETABLE_SLOTS_READ])
  findSlots() { return this.service.findSlots(); }

  @Post('slots')
  @Permissions([AppPermission.TIMETABLE_SLOTS_CREATE])
  createSlots(@Body() dto: CreateTimetableSlotDto) { return this.service.createSlots(dto); }

  @Patch('slots/:id')
  @Permissions([AppPermission.TIMETABLE_SLOTS_UPDATE])
  updateSlots(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableSlotDto) { return this.service.updateSlots(params.id, dto); }

  @Get('substitutions')
  @Permissions([AppPermission.TIMETABLE_SUBSTITUTIONS_READ])
  findSubstitutions() { return this.service.findSubstitutions(); }

  @Post('substitutions')
  @Permissions([AppPermission.TIMETABLE_SUBSTITUTIONS_CREATE])
  createSubstitutions(@Body() dto: CreateTimetableSubstitutionDto) { return this.service.createSubstitutions(dto); }

  @Patch('substitutions/:id')
  @Permissions([AppPermission.TIMETABLE_SUBSTITUTIONS_UPDATE])
  updateSubstitutions(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableSubstitutionDto) { return this.service.updateSubstitutions(params.id, dto); }

  @Get('conflicts')
  @Permissions([AppPermission.TIMETABLE_CONFLICTS_READ])
  findConflicts() { return this.service.findConflicts(); }

  @Post('conflicts')
  @Permissions([AppPermission.TIMETABLE_CONFLICTS_CREATE])
  createConflicts(@Body() dto: CreateTimetableConflictDto) { return this.service.createConflicts(dto); }

  @Patch('conflicts/:id')
  @Permissions([AppPermission.TIMETABLE_CONFLICTS_UPDATE])
  updateConflicts(@Param() params: UuidParamDto, @Body() dto: UpdateTimetableConflictDto) { return this.service.updateConflicts(params.id, dto); }
}
