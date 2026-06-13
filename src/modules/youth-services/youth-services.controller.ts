import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateMealMenuDto, CreateYouthServiceRequestDto, UpdateMealMenuDto, UpdateYouthServiceRequestDto } from './dto/youth-services.dto';
import { YouthServicesService } from './youth-services.service';

@ApiTags('Youth services') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'youth-services', version: '1' })
export class YouthServicesController {
  constructor(private readonly service: YouthServicesService) {}
  @Get('meal-menus') @Permissions([AppPermission.YOUTH_READ]) findMenus() { return this.service.findMenus(); }
  @Post('meal-menus') @Permissions([AppPermission.YOUTH_MANAGE]) createMenu(@Body() dto: CreateMealMenuDto) { return this.service.createMenu(dto); }
  @Patch('meal-menus/:id') @Permissions([AppPermission.YOUTH_MANAGE]) updateMenu(@Param() p: UuidParamDto, @Body() dto: UpdateMealMenuDto) { return this.service.updateMenu(p.id, dto); }
  @Get('requests') @Permissions([AppPermission.YOUTH_READ]) findRequests() { return this.service.findRequests(); }
  @Post('requests') @Permissions([AppPermission.YOUTH_MANAGE]) createRequest(@Body() dto: CreateYouthServiceRequestDto) { return this.service.createRequest(dto); }
  @Patch('requests/:id') @Permissions([AppPermission.YOUTH_MANAGE]) updateRequest(@Param() p: UuidParamDto, @Body() dto: UpdateYouthServiceRequestDto) { return this.service.updateRequest(p.id, dto); }
}
