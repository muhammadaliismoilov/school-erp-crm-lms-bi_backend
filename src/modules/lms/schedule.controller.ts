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
import { ScheduleActor, ScheduleService } from './schedule.service';
import {
  CreateScheduleCellDto,
  GenerateScheduleDto,
  ScheduleAvailabilityQueryDto,
  ScheduleClassesQueryDto,
  ScheduleConflictsQueryDto,
  ScheduleGridQueryDto,
  ScheduleHistoryQueryDto,
  ScheduleQuarterViewQueryDto,
  ScheduleTeacherGridQueryDto,
  SubstituteTeacherDto,
  UpdateScheduleCellDto,
} from './dto/schedule.dto';

@ApiTags('LMS — Dars jadvali')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'lms', version: '1' })
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  private actor(user: AuthenticatedUser | undefined, request: Request): ScheduleActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  @Get('lessons/classes')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Chorak uchun sinflar (boshlang‘ich/yuqori) — selektor uchun' })
  getClasses(@Query() query: ScheduleClassesQueryDto) {
    return this.service.getClasses(query.quarterId);
  }

  @Get('lessons/teachers')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Jadval selektorlari uchun o‘qituvchilar ro‘yxati' })
  getTeachers() {
    return this.service.getTeachers();
  }

  @Get('lessons/grid')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Sinf bo‘yicha haftalik dars jadvali gridi' })
  getGrid(@Query() query: ScheduleGridQueryDto) {
    return this.service.getGrid(query.quarterId, query.classId);
  }

  @Get('lessons/grid/by-teacher')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'O‘qituvchi bo‘yicha haftalik dars jadvali gridi' })
  getTeacherGrid(@Query() query: ScheduleTeacherGridQueryDto) {
    return this.service.getTeacherGrid(query.quarterId, query.teacherId);
  }

  @Get('lessons/quarter-view')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Chorak bo‘yicha barcha haftalar va sanali darslar (siqilmagan)' })
  getQuarterView(@Query() query: ScheduleQuarterViewQueryDto) {
    return this.service.getQuarterView(query.quarterId, {
      classId: query.classId,
      teacherId: query.teacherId,
    });
  }

  @Get('lessons/conflicts')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Jadval ziddiyatlari (o‘qituvchi/xona/sinf bandligi)' })
  getConflicts(@Query() query: ScheduleConflictsQueryDto) {
    return this.service.getConflicts(query.quarterId);
  }

  @Get('lessons/availability')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Aniq sana + parada band o‘qituvchi/xona/sinf' })
  getAvailability(@Query() query: ScheduleAvailabilityQueryDto) {
    return this.service.getAvailability(
      query.quarterId,
      query.lessonDate,
      query.lessonPeriodId,
      query.excludeId,
    );
  }

  @Get('lessons/history')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Dars jadvali o‘zgarishlar tarixi' })
  getHistory(@Query() query: ScheduleHistoryQueryDto) {
    return this.service.getHistory(query.quarterId, query.classId);
  }

  @Post('lessons/generate/preview')
  @Permissions([AppPermission.LMS_LESSONS_READ])
  @ApiOperation({ summary: 'Avtogeneratsiya oldidan validatsiya va xulosa' })
  preview(@Body() dto: GenerateScheduleDto) {
    return this.service.preview(dto);
  }

  @Post('lessons/generate')
  @Permissions([AppPermission.LMS_LESSONS_CREATE])
  @ApiOperation({ summary: 'Dars jadvalini avtogeneratsiya qilish' })
  generate(
    @Body() dto: GenerateScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.generate(dto, this.actor(user, request));
  }

  @Post('lessons/substitute')
  @Permissions([AppPermission.LMS_LESSONS_UPDATE])
  @ApiOperation({ summary: 'Kelgusi darslarda o‘qituvchini almashtirish' })
  substitute(
    @Body() dto: SubstituteTeacherDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.substitute(dto, this.actor(user, request));
  }

  @Post('lessons')
  @Permissions([AppPermission.LMS_LESSONS_CREATE])
  @ApiOperation({ summary: 'Jadval katagiga dars qo‘shish (chorak bo‘ylab sanali darslar)' })
  createCell(
    @Body() dto: CreateScheduleCellDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.createCell(dto, this.actor(user, request));
  }

  @Patch('lessons/:id')
  @Permissions([AppPermission.LMS_LESSONS_UPDATE])
  @ApiOperation({ summary: 'Jadval katagini yangilash (bugun va kelgusi darslar)' })
  @ApiOkResponse({ description: 'Yangilangan darslar soni' })
  updateCell(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleCellDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.updateCell(id, dto, this.actor(user, request));
  }

  @Delete('lessons/:id')
  @Permissions([AppPermission.LMS_LESSONS_DELETE])
  @ApiOperation({ summary: 'Jadval katagini o‘chirish (bugun va kelgusi darslar)' })
  deleteCell(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.deleteCell(id, this.actor(user, request));
  }
}
