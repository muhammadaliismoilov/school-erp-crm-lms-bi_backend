import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AssignStudentTransportDto, CreateRouteDto, CreateRouteStopDto, CreateTransportTripDto, CreateVehicleDto, UpdateRouteDto, UpdateRouteStopDto, UpdateTransportTripDto, UpdateVehicleDto } from './dto/transport.dto';
import { TransportService } from './transport.service';

@ApiTags('Transport') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'transport', version: '1' })
export class TransportController { constructor(private readonly service: TransportService) {}
  @Get('vehicles') @Permissions([AppPermission.TRANSPORT_READ]) findVehicles() { return this.service.findVehicles(); }
  @Post('vehicles') @Permissions([AppPermission.TRANSPORT_MANAGE]) createVehicle(@Body() dto: CreateVehicleDto) { return this.service.createVehicle(dto); }
  @Patch('vehicles/:id') @Permissions([AppPermission.TRANSPORT_MANAGE]) updateVehicle(@Param() p: UuidParamDto, @Body() dto: UpdateVehicleDto) { return this.service.updateVehicle(p.id, dto); }
  @Get('routes') @Permissions([AppPermission.TRANSPORT_READ]) findRoutes() { return this.service.findRoutes(); }
  @Post('routes') @Permissions([AppPermission.TRANSPORT_MANAGE]) createRoute(@Body() dto: CreateRouteDto) { return this.service.createRoute(dto); }
  @Patch('routes/:id') @Permissions([AppPermission.TRANSPORT_MANAGE]) updateRoute(@Param() p: UuidParamDto, @Body() dto: UpdateRouteDto) { return this.service.updateRoute(p.id, dto); }
  @Get('stops') @Permissions([AppPermission.TRANSPORT_READ]) findStops(@Query('routeId') routeId?: string) { return this.service.findStops(routeId); }
  @Post('stops') @Permissions([AppPermission.TRANSPORT_MANAGE]) createStop(@Body() dto: CreateRouteStopDto) { return this.service.createStop(dto); }
  @Patch('stops/:id') @Permissions([AppPermission.TRANSPORT_MANAGE]) updateStop(@Param() p: UuidParamDto, @Body() dto: UpdateRouteStopDto) { return this.service.updateStop(p.id, dto); }
  @Get('assignments') @Permissions([AppPermission.TRANSPORT_READ]) findAssignments(@Query('routeId') routeId?: string) { return this.service.findAssignments(routeId); }
  @Post('assignments') @Permissions([AppPermission.TRANSPORT_MANAGE]) assignStudent(@Body() dto: AssignStudentTransportDto) { return this.service.assignStudent(dto); }
  @Get('trips') @Permissions([AppPermission.TRANSPORT_READ]) findTrips(@Query('routeId') routeId?: string) { return this.service.findTrips(routeId); }
  @Post('trips') @Permissions([AppPermission.TRANSPORT_MANAGE]) createTrip(@Body() dto: CreateTransportTripDto) { return this.service.createTrip(dto); }
  @Patch('trips/:id') @Permissions([AppPermission.TRANSPORT_MANAGE]) updateTrip(@Param() p: UuidParamDto, @Body() dto: UpdateTransportTripDto) { return this.service.updateTrip(p.id, dto); }
}
