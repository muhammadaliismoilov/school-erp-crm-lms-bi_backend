import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('dashboard') @Permissions([AppPermission.ANALYTICS_READ]) dashboard() { return this.service.dashboard(); }
}
