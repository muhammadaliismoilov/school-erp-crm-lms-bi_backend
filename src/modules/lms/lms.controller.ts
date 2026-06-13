import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateExamDto, CreateExamResultDto, CreateJournalEntryDto, CreateLessonScheduleDto, UpdateExamDto, UpdateExamResultDto, UpdateJournalEntryDto, UpdateLessonScheduleDto } from './dto/lms.dto';
import { GradebookQueryDto, GradebookResponseDto, UpsertGradeDto } from './dto/gradebook.dto';
import { LmsService } from './lms.service';

@ApiTags('LMS') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'lms', version: '1' })
export class LmsController {
  constructor(private readonly service: LmsService) {}

  @Get('gradebook')
  @Permissions([AppPermission.LMS_READ])
  @ApiOperation({ summary: 'Elektron jurnal jadvali (sinf + fan + chorak bo‘yicha o‘quvchilar × darslar)' })
  @ApiOkResponse({ description: 'Jurnal matritsasi qaytarildi.', type: GradebookResponseDto })
  getGradebook(@Query() query: GradebookQueryDto) { return this.service.getGradebook(query); }

  @Put('gradebook/grade')
  @Permissions([AppPermission.LMS_MANAGE])
  @ApiOperation({ summary: 'Jurnal katagini saqlash (o‘quvchi × dars uchun baho/uy vazifasi/izoh)' })
  upsertGrade(@Body() dto: UpsertGradeDto) { return this.service.upsertGrade(dto); }

  @Get('lessons') @Permissions([AppPermission.LMS_READ]) findLessons() { return this.service.findLessons(); }
  @Post('lessons') @Permissions([AppPermission.LMS_MANAGE]) createLesson(@Body() dto: CreateLessonScheduleDto) { return this.service.createLesson(dto); }
  @Patch('lessons/:id') @Permissions([AppPermission.LMS_MANAGE]) updateLesson(@Param() p: UuidParamDto, @Body() dto: UpdateLessonScheduleDto) { return this.service.updateLesson(p.id, dto); }
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
