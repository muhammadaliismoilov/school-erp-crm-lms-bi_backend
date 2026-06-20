import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { StudentProfileService } from "./student-profile.service";

@ApiTags("O‘quvchi profili")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "students/:id", version: "1" })
export class StudentProfileController {
  constructor(private readonly profileService: StudentProfileService) {}

  @Get("overview")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi umumiy ma'lumoti (GPA, davomat, reyting, tanga)" })
  @ApiOkResponse({ description: "Umumiy ma'lumot qaytarildi." })
  overview(@Param() params: UuidParamDto) {
    return this.profileService.getOverview(params.id);
  }

  @Get("grades")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi baholari (GPA dinamikasi, chorak baholar, progress testlar)" })
  @ApiOkResponse({ description: "Baholar qaytarildi." })
  grades(@Param() params: UuidParamDto) {
    return this.profileService.getGrades(params.id);
  }

  @Get("attendance")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi davomati (yig‘indi + so‘nggi yozuvlar)" })
  @ApiOkResponse({ description: "Davomat qaytarildi." })
  attendance(@Param() params: UuidParamDto) {
    return this.profileService.getAttendance(params.id);
  }

  @Get("schedule")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi haftalik dars jadvali" })
  @ApiOkResponse({ description: "Jadval qaytarildi." })
  schedule(@Param() params: UuidParamDto) {
    return this.profileService.getSchedule(params.id);
  }

  @Get("payments")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi to‘lovlar tarixi" })
  @ApiOkResponse({ description: "To‘lovlar qaytarildi." })
  payments(@Param() params: UuidParamDto) {
    return this.profileService.getPayments(params.id);
  }
}
