import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AverageReportQueryDto,
  ProgressExamReportQueryDto,
  QuarterlyReportQueryDto,
} from './dto/progress-report-query.dto';
import { ProgressReportsService } from './progress-reports.service';
import {
  AverageReportSchema,
  ProgressExamReportSchema,
  QuarterlyReportSchema,
} from './swagger/progress-report-response.schema';

@ApiTags('O‘zlashtirish hisobotlari')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('progress-reports')
export class ProgressReportsController {
  constructor(private readonly service: ProgressReportsService) {}

  @Get('average')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'O‘rtacha o‘zlashtirish ko‘rsatkichlari (fan bo‘yicha matritsa).' })
  @ApiResponse({ status: 200, type: AverageReportSchema })
  average(@Query() query: AverageReportQueryDto): Promise<AverageReportSchema> {
    return this.service.getAverageReport(query);
  }

  @Get('quarterly')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'Choraklik ko‘rsatkichlari (fan × chorak matritsasi).' })
  @ApiResponse({ status: 200, type: QuarterlyReportSchema })
  quarterly(@Query() query: QuarterlyReportQueryDto): Promise<QuarterlyReportSchema> {
    return this.service.getQuarterlyReport(query);
  }

  @Get('progress-exams')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'Progress imtihon ko‘rsatkichlari (o‘rtacha baho va ball).' })
  @ApiResponse({ status: 200, type: ProgressExamReportSchema })
  progressExams(@Query() query: ProgressExamReportQueryDto): Promise<ProgressExamReportSchema> {
    return this.service.getProgressExamReport(query);
  }
}
