import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { AttendanceSettingsService } from './attendance-settings.service';
import { UpdateAttendanceSettingsDto } from './dto/attendance-settings.dto';

@ApiTags('Davomat sozlamalari')
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'attendance/settings', version: '1' })
export class AttendanceSettingsController {
  constructor(private readonly service: AttendanceSettingsService) {}

  @Get()
  @Permissions([AppPermission.ATTENDANCE_SETTINGS_READ])
  @ApiOperation({ summary: 'Joriy davomat sozlamalari (yoki standart qiymatlar)' })
  @ApiOkResponse({ description: 'Sozlamalar.' })
  current() {
    return this.service.current();
  }

  @Put()
  @Permissions([AppPermission.ATTENDANCE_SETTINGS_UPDATE])
  @ApiOperation({ summary: 'Davomat sozlamalarini saqlash (upsert)' })
  @ApiOkResponse({ description: 'Yangilangan sozlamalar.' })
  update(@Body() dto: UpdateAttendanceSettingsDto) {
    return this.service.update(dto);
  }
}
