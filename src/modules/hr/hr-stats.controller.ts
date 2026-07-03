import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { HrStatsService } from './hr-stats.service';

@ApiTags('HR Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/statistics', version: '1' })
export class HrStatsController {
  constructor(private readonly hrStatsService: HrStatsService) {}

  @Get('overview')
  @Permissions([AppPermission.HR_STATISTICS_READ])
  overview() {
    return this.hrStatsService.overview();
  }
}
