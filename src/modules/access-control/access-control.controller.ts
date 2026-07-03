import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccessControlService } from './access-control.service';
import { CreateAccessDeviceDto, CreateAccessEventDto, UpdateAccessDeviceDto, UpsertFaceProfileDto } from './dto/access-control.dto';

@ApiTags('Access Control') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'access-control', version: '1' })
export class AccessControlController { constructor(private readonly service: AccessControlService) {}
  @Get('devices') @Permissions([AppPermission.ACCESS_CONTROL_DEVICES_READ]) findDevices() { return this.service.findDevices(); }
  @Post('devices') @Permissions([AppPermission.ACCESS_CONTROL_DEVICES_CREATE]) createDevice(@Body() dto: CreateAccessDeviceDto) { return this.service.createDevice(dto); }
  @Patch('devices/:id') @Permissions([AppPermission.ACCESS_CONTROL_DEVICES_UPDATE]) updateDevice(@Param() p: UuidParamDto, @Body() dto: UpdateAccessDeviceDto) { return this.service.updateDevice(p.id, dto); }
  @Get('face-profiles') @Permissions([AppPermission.ACCESS_CONTROL_FACE_PROFILES_READ]) findProfiles(@Query('personType') personType?: string, @Query('personId') personId?: string) { return this.service.findProfiles(personType, personId); }
  @Post('face-profiles') @Permissions([AppPermission.ACCESS_CONTROL_FACE_PROFILES_CREATE]) upsertProfile(@Body() dto: UpsertFaceProfileDto) { return this.service.upsertProfile(dto); }
  @Get('events') @Permissions([AppPermission.ACCESS_CONTROL_EVENTS_READ]) findEvents(@Query('personType') personType?: string, @Query('personId') personId?: string) { return this.service.findEvents(personType, personId); }
  @Post('events') @Permissions([AppPermission.ACCESS_CONTROL_EVENTS_CREATE]) createEvent(@Body() dto: CreateAccessEventDto) { return this.service.createEvent(dto); }
}
