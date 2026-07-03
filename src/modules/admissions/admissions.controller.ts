import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateAdmissionPipelineDto, UpdateAdmissionPipelineDto, CreateAdmissionStageDto, UpdateAdmissionStageDto, CreateAdmissionApplicationDto, UpdateAdmissionApplicationDto, CreateEntranceExamDto, UpdateEntranceExamDto, CreateAdmissionDecisionDto, UpdateAdmissionDecisionDto } from './dto/admissions.dto';
import { AdmissionsService } from './admissions.service';

@ApiTags('Admissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'admissions', version: '1' })
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  @Get('pipelines')
  @Permissions([AppPermission.ADMISSIONS_PIPELINES_READ])
  findPipelines() { return this.service.findPipelines(); }

  @Post('pipelines')
  @Permissions([AppPermission.ADMISSIONS_PIPELINES_CREATE])
  createPipelines(@Body() dto: CreateAdmissionPipelineDto) { return this.service.createPipelines(dto); }

  @Patch('pipelines/:id')
  @Permissions([AppPermission.ADMISSIONS_PIPELINES_UPDATE])
  updatePipelines(@Param() params: UuidParamDto, @Body() dto: UpdateAdmissionPipelineDto) { return this.service.updatePipelines(params.id, dto); }

  @Get('stages')
  @Permissions([AppPermission.ADMISSIONS_STAGES_READ])
  findStages() { return this.service.findStages(); }

  @Post('stages')
  @Permissions([AppPermission.ADMISSIONS_STAGES_CREATE])
  createStages(@Body() dto: CreateAdmissionStageDto) { return this.service.createStages(dto); }

  @Patch('stages/:id')
  @Permissions([AppPermission.ADMISSIONS_STAGES_UPDATE])
  updateStages(@Param() params: UuidParamDto, @Body() dto: UpdateAdmissionStageDto) { return this.service.updateStages(params.id, dto); }

  @Get('applications')
  @Permissions([AppPermission.ADMISSIONS_APPLICATIONS_READ])
  findApplications() { return this.service.findApplications(); }

  @Post('applications')
  @Permissions([AppPermission.ADMISSIONS_APPLICATIONS_CREATE])
  createApplications(@Body() dto: CreateAdmissionApplicationDto) { return this.service.createApplications(dto); }

  @Patch('applications/:id')
  @Permissions([AppPermission.ADMISSIONS_APPLICATIONS_UPDATE])
  updateApplications(@Param() params: UuidParamDto, @Body() dto: UpdateAdmissionApplicationDto) { return this.service.updateApplications(params.id, dto); }

  @Get('exams')
  @Permissions([AppPermission.ADMISSIONS_EXAMS_READ])
  findExams() { return this.service.findExams(); }

  @Post('exams')
  @Permissions([AppPermission.ADMISSIONS_EXAMS_CREATE])
  createExams(@Body() dto: CreateEntranceExamDto) { return this.service.createExams(dto); }

  @Patch('exams/:id')
  @Permissions([AppPermission.ADMISSIONS_EXAMS_UPDATE])
  updateExams(@Param() params: UuidParamDto, @Body() dto: UpdateEntranceExamDto) { return this.service.updateExams(params.id, dto); }

  @Get('decisions')
  @Permissions([AppPermission.ADMISSIONS_DECISIONS_READ])
  findDecisions() { return this.service.findDecisions(); }

  @Post('decisions')
  @Permissions([AppPermission.ADMISSIONS_DECISIONS_CREATE])
  createDecisions(@Body() dto: CreateAdmissionDecisionDto) { return this.service.createDecisions(dto); }

  @Patch('decisions/:id')
  @Permissions([AppPermission.ADMISSIONS_DECISIONS_UPDATE])
  updateDecisions(@Param() params: UuidParamDto, @Body() dto: UpdateAdmissionDecisionDto) { return this.service.updateDecisions(params.id, dto); }
}
