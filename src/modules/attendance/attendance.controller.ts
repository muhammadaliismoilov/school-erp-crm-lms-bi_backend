import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { AttendanceService } from "./attendance.service";
import { AttendanceDateQueryDto } from "./dto/attendance-date-query.dto";
import { RecordStudentAttendanceDto } from "./dto/record-student-attendance.dto";

@ApiTags("Davomat")
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "attendance", version: "1" })
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("students")
  @Permissions([AppPermission.ATTENDANCE_RECORDS_READ])
  @ApiOperation({ summary: "O‘quvchi davomat yozuvlarini sana bo‘yicha olish" })
  @ApiOkResponse({ description: "Davomat yozuvlari qaytarildi." })
  findByDate(@Query() query: AttendanceDateQueryDto) {
    return this.attendanceService.findByDate(query.date);
  }

  @Get("daily")
  @Permissions([AppPermission.ATTENDANCE_RECORDS_READ])
  @ApiOperation({
    summary: "Kunlik turniket taxtasi (ism/sinf + kirish-chiqish + yig‘ma hisob)",
  })
  @ApiOkResponse({ description: "Kunlik davomat taxtasi." })
  dailyBoard(@Query() query: AttendanceDateQueryDto) {
    return this.attendanceService.dailyBoard(query.date);
  }

  @Post("students")
  @Permissions([AppPermission.ATTENDANCE_RECORDS_CREATE])
  @ApiOperation({
    summary: "O‘quvchi davomat yozuvini yaratish yoki tahrirlash",
  })
  @ApiCreatedResponse({ description: "Davomat yozuvi saqlandi." })
  recordStudentAttendance(@Body() dto: RecordStudentAttendanceDto) {
    return this.attendanceService.recordStudentAttendance(dto);
  }
}
