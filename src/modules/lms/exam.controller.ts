import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import {
  CreateClassExamDto,
  CreateCourseExamDto,
  ExamListResponseDto,
  ExamQueryDto,
  ExamResponseDto,
  ExamTeacherQueryDto,
  UpdateExamDto,
} from './dto/exam.dto';
import { ExamActor, ExamService } from './exam.service';

@ApiTags('LMS — Progress imtihonlar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'lms/exams', version: '1' })
export class ExamController {
  constructor(private readonly service: ExamService) {}

  private actor(user: AuthenticatedUser | undefined, request: Request): ExamActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  @Get('options')
  @Permissions([AppPermission.LMS_EXAMS_READ])
  @ApiOperation({ summary: 'Imtihon tayinlash selektorlari (fanlar, sinflar, kurslar, choraklar)' })
  getOptions() {
    return this.service.getOptions();
  }

  @Get('teachers')
  @Permissions([AppPermission.LMS_EXAMS_READ])
  @ApiOperation({ summary: 'Imtihon uchun o‘qituvchilar (sinf + fan bo‘yicha filtrlangan)' })
  getTeachers(@Query() query: ExamTeacherQueryDto) {
    return this.service.getTeachers(query.classId, query.subjectId);
  }

  @Get()
  @Permissions([AppPermission.LMS_EXAMS_READ])
  @ApiOperation({ summary: 'Imtihonlar ro‘yxati (filtr + statistika + pagination)' })
  @ApiOkResponse({ type: ExamListResponseDto })
  findExams(@Query() query: ExamQueryDto) {
    return this.service.findExams(query);
  }

  @Get(':id')
  @Permissions([AppPermission.LMS_EXAMS_READ])
  @ApiOperation({ summary: 'Bitta imtihon tafsiloti' })
  @ApiOkResponse({ type: ExamResponseDto })
  findExam(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findExam(id);
  }

  @Post('class')
  @Permissions([AppPermission.LMS_EXAMS_CREATE])
  @ApiOperation({ summary: 'Sinf imtihonini tayinlash' })
  createClassExam(
    @Body() dto: CreateClassExamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.createClassExam(dto, this.actor(user, request));
  }

  @Post('course')
  @Permissions([AppPermission.LMS_EXAMS_CREATE])
  @ApiOperation({ summary: 'Kurs imtihonini tayinlash' })
  createCourseExam(
    @Body() dto: CreateCourseExamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.createCourseExam(dto, this.actor(user, request));
  }

  @Patch(':id')
  @Permissions([AppPermission.LMS_EXAMS_UPDATE])
  @ApiOperation({ summary: 'Imtihonni yangilash' })
  updateExam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.updateExam(id, dto, this.actor(user, request));
  }

  @Post(':id/publish')
  @Permissions([AppPermission.LMS_EXAMS_UPDATE])
  @ApiOperation({ summary: 'Imtihonni tayyor (e’lon qilingan) holatga keltirish' })
  publishExam(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.publishExam(id, this.actor(user, request));
  }

  @Delete(':id')
  @Permissions([AppPermission.LMS_EXAMS_DELETE])
  @ApiOperation({ summary: 'Imtihonni o‘chirish (natija/yakun yo‘q bo‘lsa)' })
  deleteExam(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.deleteExam(id, this.actor(user, request));
  }
}
