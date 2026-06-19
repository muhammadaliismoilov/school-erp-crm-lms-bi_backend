import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { CreateExamDto, CreateExamResultDto, CreateJournalEntryDto, UpdateExamDto, UpdateExamResultDto, UpdateJournalEntryDto } from './dto/lms.dto';
import { AwardJournalCoinDto, GenerateJournalLessonsDto, GradebookQueryDto, GradebookResponseDto, QuarterGradeDto, StudentProgressQueryDto, UpsertGradeDto } from './dto/gradebook.dto';
import { GradebookService } from './gradebook.service';
import { LmsService } from './lms.service';

@ApiTags('LMS') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'lms', version: '1' })
export class LmsController {
  constructor(private readonly service: LmsService, private readonly gradebook: GradebookService) {}

  @Get('gradebook')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'Elektron jurnal jadvali (sinf + fan + chorak bo‘yicha o‘quvchilar × darslar)' })
  @ApiOkResponse({ description: 'Jurnal matritsasi qaytarildi.', type: GradebookResponseDto })
  getGradebook(@Query() query: GradebookQueryDto) { return this.gradebook.getGradebook(query); }

  @Put('gradebook/grade')
  @Permissions([AppPermission.LMS_MANAGE])
  @ApiOperation({ summary: 'Jurnal katagini saqlash (baho/ball/davomat/uy vazifasi/izoh)' })
  upsertGrade(@Body() dto: UpsertGradeDto) { return this.gradebook.upsertGrade(dto); }

  @Put('gradebook/quarter-grade')
  @Permissions([AppPermission.LMS_MANAGE])
  @ApiOperation({ summary: 'Choraklik yakuniy bahoni saqlash (o‘quvchi × fan × chorak)' })
  setQuarterGrade(@Body() dto: QuarterGradeDto) { return this.gradebook.setQuarterGrade(dto); }

  @Post('gradebook/generate-lessons')
  @Permissions([AppPermission.LMS_MANAGE])
  @ApiOperation({ summary: 'Darslarni jadvaldan chorak bo‘ylab materializatsiya qilish' })
  generateLessons(@Body() dto: GenerateJournalLessonsDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.gradebook.generateLessons(dto, { userId: user?.id, ipAddress: req?.ip });
  }

  @Get('gradebook/coin-presets')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'Tanga presetlari (jurnal katak editori uchun)' })
  coinPresets() { return this.gradebook.listCoinPresets(); }

  @Post('gradebook/coins')
  @Permissions([AppPermission.LMS_MANAGE])
  @ApiOperation({ summary: 'Jurnal katagidan tanga berish/ayrish' })
  awardCoin(@Body() dto: AwardJournalCoinDto) { return this.gradebook.awardCoin(dto); }

  @Get('gradebook/student/:id')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'O‘quvchi progressi (GPA, fan bo‘yicha baho va davomat)' })
  studentProgress(@Param('id', ParseUUIDPipe) id: string, @Query() query: StudentProgressQueryDto) {
    return this.gradebook.getStudentProgress(id, query.quarterId);
  }

  // Dars jadvali (lessons) endpointlari ScheduleController (schedule.controller.ts) ga ko'chirildi.
  @Get('journal') @Permissions([AppPermission.LMS_READ]) findJournalEntries() { return this.service.findJournalEntries(); }
  @Post('journal') @Permissions([AppPermission.LMS_MANAGE]) createJournalEntry(@Body() dto: CreateJournalEntryDto) { return this.service.createJournalEntry(dto); }
  @Patch('journal/:id') @Permissions([AppPermission.LMS_MANAGE]) updateJournalEntry(@Param() p: UuidParamDto, @Body() dto: UpdateJournalEntryDto) { return this.service.updateJournalEntry(p.id, dto); }
  @Get('exams') @Permissions([AppPermission.LMS_READ]) findExams() { return this.service.findExams(); }
  @Post('exams') @Permissions([AppPermission.LMS_MANAGE]) createExam(@Body() dto: CreateExamDto) { return this.service.createExam(dto); }
  @Patch('exams/:id') @Permissions([AppPermission.LMS_MANAGE]) updateExam(@Param() p: UuidParamDto, @Body() dto: UpdateExamDto) { return this.service.updateExam(p.id, dto); }
  @Get('exam-results') @Permissions([AppPermission.LMS_READ]) findExamResults() { return this.service.findExamResults(); }
  @Post('exam-results') @Permissions([AppPermission.LMS_MANAGE]) createExamResult(@Body() dto: CreateExamResultDto) { return this.service.createExamResult(dto); }
  @Patch('exam-results/:id') @Permissions([AppPermission.LMS_MANAGE]) updateExamResult(@Param() p: UuidParamDto, @Body() dto: UpdateExamResultDto) { return this.service.updateExamResult(p.id, dto); }
}
