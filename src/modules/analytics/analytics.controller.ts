import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { AnalyticsService } from './analytics.service';
import { DashboardOverviewService } from './dashboard-overview.service';

@ApiTags('Analytics') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService,
    private readonly overviewService: DashboardOverviewService,
  ) {}

  @Get('dashboard') @Permissions([AppPermission.ANALYTICS_READ]) dashboard() { return this.service.dashboard(); }

  /**
   * Asosiy dashboard yig'ma ko'rsatkichlari. Maxsus ruxsat talab qilinmaydi —
   * har seksiya foydalanuvchining o'z ruxsatlariga qarab server tomonda
   * kiritiladi/yashiriladi (ruxsati yo'q bo'lim javobda umuman bo'lmaydi).
   */
  @Get('overview')
  @ApiOperation({ summary: "Asosiy dashboard KPI + diqqat markazi (rolga mos)" })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.overviewService.overview(user);
  }
}
