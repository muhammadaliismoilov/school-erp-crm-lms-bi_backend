import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
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
import { UpsertSchoolDto } from "./dto/upsert-school.dto";
import { SettingsService } from "./settings.service";

@ApiTags("Sozlamalar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "settings", version: "1" })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("school")
  @Permissions([AppPermission.SETTINGS_SCHOOL_READ])
  @ApiOperation({ summary: "Maktab profili va filiallarini olish" })
  @ApiOkResponse({ description: "Maktab sozlamalari qaytarildi." })
  getSchool() {
    return this.settingsService.getSchool();
  }

  @Put("school")
  @Permissions([AppPermission.SETTINGS_SCHOOL_UPDATE])
  @ApiOperation({ summary: "Maktab profilini yaratish yoki tahrirlash" })
  @ApiOkResponse({ description: "Maktab sozlamalari saqlandi." })
  upsertSchool(@Body() dto: UpsertSchoolDto) {
    return this.settingsService.upsertSchool(dto);
  }
}
