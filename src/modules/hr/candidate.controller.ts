import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CandidateQueryDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  UpdateCandidateStageDto,
} from './dto/candidate.dto';
import { CandidateService } from './candidate.service';

@ApiTags('HR Candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/candidates', version: '1' })
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get() @Permissions([AppPermission.HR_READ]) find(@Query() query: CandidateQueryDto) { return this.candidateService.findCandidates(query); }
  @Get(':id') @Permissions([AppPermission.HR_READ]) get(@Param() p: UuidParamDto) { return this.candidateService.getCandidate(p.id); }
  @Post() @Permissions([AppPermission.HR_MANAGE]) create(@Body() dto: CreateCandidateDto) { return this.candidateService.createCandidate(dto); }
  @Patch(':id/stage') @Permissions([AppPermission.HR_MANAGE]) updateStage(@Param() p: UuidParamDto, @Body() dto: UpdateCandidateStageDto) { return this.candidateService.updateStage(p.id, dto); }
  @Patch(':id') @Permissions([AppPermission.HR_MANAGE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateCandidateDto) { return this.candidateService.updateCandidate(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_MANAGE]) remove(@Param() p: UuidParamDto) { return this.candidateService.removeCandidate(p.id); }
}
