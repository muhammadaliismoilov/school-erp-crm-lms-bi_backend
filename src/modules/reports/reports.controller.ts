import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ReportDateRangeDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';
@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'reports', version: '1' })
export class ReportsController { constructor(private readonly service: ReportsService) {}
  @Get('cashflow') @Permissions([AppPermission.REPORTS_READ]) cashflow(@Query() q: ReportDateRangeDto) { return this.service.cashflow(q); }
  @Get('profit-loss') @Permissions([AppPermission.REPORTS_READ]) profitLoss(@Query() q: ReportDateRangeDto) { return this.service.profitLoss(q); }
  @Get('payments-by-method') @Permissions([AppPermission.REPORTS_READ]) paymentsByMethod(@Query() q: ReportDateRangeDto) { return this.service.paymentsByMethod(q); }
  @Get('academic-overview') @Permissions([AppPermission.REPORTS_READ]) academicOverview() { return this.service.academicOverview(); }
}
