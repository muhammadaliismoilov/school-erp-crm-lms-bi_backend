import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
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
import {
  CreateAchievementDto,
  QueryAchievementsDto,
  UpdateAchievementDto,
} from "./dto/achievement.dto";
import { StudentAchievementService } from "./student-achievement.service";

@ApiTags("O‘quvchi yutuqlari")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "students/:id/achievements", version: "1" })
export class StudentAchievementController {
  constructor(private readonly service: StudentAchievementService) {}

  @Get()
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "O‘quvchi yutuqlari ro‘yxati" })
  @ApiOkResponse({ description: "Yutuqlar qaytarildi." })
  list(@Param("id") id: string, @Query() query: QueryAchievementsDto) {
    return this.service.list(id, query);
  }

  @Get("stats")
  @Permissions([AppPermission.STUDENTS_READ])
  @ApiOperation({ summary: "Yutuqlar statistikasi (jami / 1 / 2 / 3-o‘rin)" })
  @ApiOkResponse({ description: "Statistika qaytarildi." })
  stats(@Param("id") id: string) {
    return this.service.stats(id);
  }

  @Post()
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Yutuq qo‘shish" })
  @ApiCreatedResponse({ description: "Yutuq qo‘shildi." })
  create(@Param("id") id: string, @Body() dto: CreateAchievementDto) {
    return this.service.create(id, dto);
  }

  @Patch(":achievementId")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Yutuqni tahrirlash" })
  @ApiOkResponse({ description: "Yutuq tahrirlandi." })
  update(
    @Param("id") id: string,
    @Param("achievementId") achievementId: string,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.service.update(id, achievementId, dto);
  }

  @Delete(":achievementId")
  @Permissions([AppPermission.STUDENTS_MANAGE])
  @ApiOperation({ summary: "Yutuqni o‘chirish" })
  @ApiOkResponse({ description: "Yutuq o‘chirildi." })
  remove(@Param("id") id: string, @Param("achievementId") achievementId: string) {
    return this.service.remove(id, achievementId);
  }
}
