import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateStudentHealthRecordDto, UpdateStudentHealthRecordDto, CreateNurseVisitDto, UpdateNurseVisitDto, CreateSafetyIncidentDto, UpdateSafetyIncidentDto, CreateEmergencyDrillDto, UpdateEmergencyDrillDto } from './dto/health-safety.dto';
import { HealthSafetyService } from './health-safety.service';

@ApiTags('Health & Safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'health-safety', version: '1' })
export class HealthSafetyController {
  constructor(private readonly service: HealthSafetyService) {}

  @Get('records')
  @Permissions([AppPermission.HEALTH_SAFETY_RECORDS_READ])
  findRecords() { return this.service.findRecords(); }

  @Post('records')
  @Permissions([AppPermission.HEALTH_SAFETY_RECORDS_CREATE])
  createRecords(@Body() dto: CreateStudentHealthRecordDto) { return this.service.createRecords(dto); }

  @Patch('records/:id')
  @Permissions([AppPermission.HEALTH_SAFETY_RECORDS_UPDATE])
  updateRecords(@Param() params: UuidParamDto, @Body() dto: UpdateStudentHealthRecordDto) { return this.service.updateRecords(params.id, dto); }

  @Get('nurse-visits')
  @Permissions([AppPermission.HEALTH_SAFETY_NURSE_VISITS_READ])
  findNurseVisits() { return this.service.findNurseVisits(); }

  @Post('nurse-visits')
  @Permissions([AppPermission.HEALTH_SAFETY_NURSE_VISITS_CREATE])
  createNurseVisits(@Body() dto: CreateNurseVisitDto) { return this.service.createNurseVisits(dto); }

  @Patch('nurse-visits/:id')
  @Permissions([AppPermission.HEALTH_SAFETY_NURSE_VISITS_UPDATE])
  updateNurseVisits(@Param() params: UuidParamDto, @Body() dto: UpdateNurseVisitDto) { return this.service.updateNurseVisits(params.id, dto); }

  @Get('incidents')
  @Permissions([AppPermission.HEALTH_SAFETY_INCIDENTS_READ])
  findIncidents() { return this.service.findIncidents(); }

  @Post('incidents')
  @Permissions([AppPermission.HEALTH_SAFETY_INCIDENTS_CREATE])
  createIncidents(@Body() dto: CreateSafetyIncidentDto) { return this.service.createIncidents(dto); }

  @Patch('incidents/:id')
  @Permissions([AppPermission.HEALTH_SAFETY_INCIDENTS_UPDATE])
  updateIncidents(@Param() params: UuidParamDto, @Body() dto: UpdateSafetyIncidentDto) { return this.service.updateIncidents(params.id, dto); }

  @Get('drills')
  @Permissions([AppPermission.HEALTH_SAFETY_DRILLS_READ])
  findDrills() { return this.service.findDrills(); }

  @Post('drills')
  @Permissions([AppPermission.HEALTH_SAFETY_DRILLS_CREATE])
  createDrills(@Body() dto: CreateEmergencyDrillDto) { return this.service.createDrills(dto); }

  @Patch('drills/:id')
  @Permissions([AppPermission.HEALTH_SAFETY_DRILLS_UPDATE])
  updateDrills(@Param() params: UuidParamDto, @Body() dto: UpdateEmergencyDrillDto) { return this.service.updateDrills(params.id, dto); }
}
