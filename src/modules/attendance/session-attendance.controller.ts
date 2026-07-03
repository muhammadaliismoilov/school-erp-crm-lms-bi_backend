import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import {
  ConfirmSessionDto,
  OpenSessionDto,
  SessionListQueryDto,
  UpdateAttendanceEntryDto,
} from './dto/session-attendance.dto';
import { SessionAttendanceService } from './session-attendance.service';

@ApiTags('Sessiya davomati')
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'attendance-sessions', version: '1' })
export class SessionAttendanceController {
  constructor(private readonly service: SessionAttendanceService) {}

  @Get()
  @Permissions([AppPermission.CLASS_SESSIONS_READ])
  @ApiOperation({ summary: 'Sana bo‘yicha dars/kurs sessiyalari' })
  @ApiOkResponse({ description: 'Sessiyalar ro‘yxati.' })
  list(@Query() query: SessionListQueryDto) {
    return this.service.listSessions(query.date, query.teacherId);
  }

  @Post('open')
  @Permissions([AppPermission.CLASS_SESSIONS_CREATE])
  @ApiOperation({
    summary: 'Sessiyani ochish va turniketdan davomatni avtomatik to‘ldirish',
    description:
      'Berilgan slot va sana uchun sessiyani ochadi (yoki mavjudini qaytaradi). Birinchi ochilishda ' +
      'sinf o‘quvchilariga turniket ma’lumoti asosida default davomat (keldi/kechikdi/yo‘q) qo‘yiladi.',
  })
  @ApiCreatedResponse({ description: 'Sessiya va davomat ro‘yxati.' })
  open(@Body() dto: OpenSessionDto) {
    return this.service.openSession(dto.slotId, dto.date);
  }

  @Get(':id/roster')
  @Permissions([AppPermission.SESSION_ATTENDANCE_READ])
  @ApiOperation({ summary: 'Sessiya davomat ro‘yxati' })
  @ApiOkResponse({ description: 'Davomat yozuvlari.' })
  roster(@Param('id') id: string) {
    return this.service.roster(id);
  }

  @Post(':id/confirm')
  @Permissions([AppPermission.SESSION_ATTENDANCE_UPDATE])
  @ApiOperation({
    summary: 'O‘qituvchi davomatni tasdiqlaydi (tuzatishlar bilan)',
    description: 'Faqat o‘zgargan yozuvlar `entries` da yuboriladi; qolganlari avtomatik holatida qoladi.',
  })
  @ApiOkResponse({ description: 'Sessiya tasdiqlandi.' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.confirmSession(id, dto, user.id);
  }

  @Patch(':id/students/:studentId')
  @Permissions([AppPermission.SESSION_ATTENDANCE_UPDATE])
  @ApiOperation({
    summary: 'Yakka o‘quvchi davomatini tuzatish / kechikkanni qo‘shish',
    description: 'Tasdiqlangandan keyin faqat sozlamadagi tuzatish oynasi ichida ruxsat etiladi. Har o‘zgarish auditga yoziladi.',
  })
  @ApiOkResponse({ description: 'Davomat yangilandi.' })
  updateOne(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateAttendanceEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateAttendance(id, studentId, dto, user.id);
  }
}
