import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateGeofenceFullDto, GeofenceQueryDto, UpdateGeofenceFullDto } from './dto/geofence.dto';
import { GeofenceService } from './geofence.service';

@ApiTags('HR Geofences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/geofences', version: '1' })
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Get('options') @Permissions([AppPermission.HR_GEOFENCES_READ]) options() { return this.geofenceService.options(); }
  @Get() @Permissions([AppPermission.HR_GEOFENCES_READ]) find(@Query() query: GeofenceQueryDto) { return this.geofenceService.findGeofences(query); }
  @Get(':id') @Permissions([AppPermission.HR_GEOFENCES_READ]) get(@Param() p: UuidParamDto) { return this.geofenceService.getGeofence(p.id); }
  @Post() @Permissions([AppPermission.HR_GEOFENCES_CREATE]) create(@Body() dto: CreateGeofenceFullDto) { return this.geofenceService.createGeofence(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_GEOFENCES_UPDATE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateGeofenceFullDto) { return this.geofenceService.updateGeofence(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_GEOFENCES_DELETE]) remove(@Param() p: UuidParamDto) { return this.geofenceService.removeGeofence(p.id); }
}
