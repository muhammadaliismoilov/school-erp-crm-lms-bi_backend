import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateSurveyDto, SurveyQueryDto, UpdateSurveyDto } from './dto/survey.dto';
import { SurveyService } from './survey.service';

@ApiTags('HR Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/surveys', version: '1' })
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Get() @Permissions([AppPermission.HR_SURVEYS_READ]) find(@Query() query: SurveyQueryDto) { return this.surveyService.findSurveys(query); }
  @Get(':id') @Permissions([AppPermission.HR_SURVEYS_READ]) get(@Param() p: UuidParamDto) { return this.surveyService.getSurvey(p.id); }
  @Post() @Permissions([AppPermission.HR_SURVEYS_CREATE]) create(@Body() dto: CreateSurveyDto) { return this.surveyService.createSurvey(dto); }
  @Patch(':id/publish') @Permissions([AppPermission.HR_SURVEYS_UPDATE]) publish(@Param() p: UuidParamDto) { return this.surveyService.publishSurvey(p.id); }
  @Patch(':id/close') @Permissions([AppPermission.HR_SURVEYS_UPDATE]) close(@Param() p: UuidParamDto) { return this.surveyService.closeSurvey(p.id); }
  @Patch(':id') @Permissions([AppPermission.HR_SURVEYS_UPDATE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateSurveyDto) { return this.surveyService.updateSurvey(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_SURVEYS_DELETE]) remove(@Param() p: UuidParamDto) { return this.surveyService.removeSurvey(p.id); }
}
