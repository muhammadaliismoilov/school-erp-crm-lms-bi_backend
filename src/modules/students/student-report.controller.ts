import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import {
  UpsertConclusionDto,
  UpsertSmartGoalsDto,
} from "./dto/student-report.dto";
import { StudentReportService } from "./student-report.service";

@ApiTags("O‘quvchi xulosa va yillik hisobot")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "students/:id", version: "1" })
export class StudentReportController {
  constructor(private readonly service: StudentReportService) {}

  @Get("conclusions")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Tutor va psixolog xulosalari" })
  @ApiOkResponse({ description: "Xulosa qaytarildi." })
  getConclusion(@Param("id") id: string, @Query("year") year?: string) {
    return this.service.getConclusion(id, year);
  }

  @Put("conclusions")
  @Permissions([AppPermission.STUDENT_REPORTS_UPDATE])
  @ApiOperation({ summary: "Xulosani saqlash" })
  @ApiOkResponse({ description: "Xulosa saqlandi." })
  upsertConclusion(@Param("id") id: string, @Body() dto: UpsertConclusionDto) {
    return this.service.upsertConclusion(id, dto);
  }

  @Get("smart-goals")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Kelajak rejasi (SMART maqsadlar)" })
  @ApiOkResponse({ description: "Reja qaytarildi." })
  getSmartGoals(@Param("id") id: string, @Query("year") year?: string) {
    return this.service.getSmartGoals(id, year);
  }

  @Put("smart-goals")
  @Permissions([AppPermission.STUDENT_REPORTS_UPDATE])
  @ApiOperation({ summary: "Kelajak rejasini saqlash" })
  @ApiOkResponse({ description: "Reja saqlandi." })
  upsertSmartGoals(@Param("id") id: string, @Body() dto: UpsertSmartGoalsDto) {
    return this.service.upsertSmartGoals(id, dto);
  }
}
