import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CounselingService } from "./counseling.service";
import {
  CreateCounselingSessionDto,
  UpdateCounselingSessionDto,
} from "./dto/counseling.dto";

/**
 * Confidential. Both permissions below are excluded from the broad
 * director/admin role grants, so only the PSYCHOLOGIST role (and the technical
 * super-admin wildcard) can reach these endpoints.
 */
@ApiTags("Psixolog (maxfiy)")
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "counseling", version: "1" })
export class CounselingController {
  constructor(private readonly service: CounselingService) {}

  @Get("sessions")
  @Permissions([AppPermission.COUNSELING_READ])
  findAll() {
    return this.service.findAll();
  }

  @Get("sessions/:id")
  @Permissions([AppPermission.COUNSELING_READ])
  findOne(@Param() params: UuidParamDto) {
    return this.service.findOne(params.id);
  }

  @Get("students/:id/sessions")
  @Permissions([AppPermission.COUNSELING_READ])
  findByStudent(@Param() params: UuidParamDto) {
    return this.service.findByStudent(params.id);
  }

  @Post("sessions")
  @Permissions([AppPermission.COUNSELING_MANAGE])
  create(@Body() dto: CreateCounselingSessionDto) {
    return this.service.create(dto);
  }

  @Patch("sessions/:id")
  @Permissions([AppPermission.COUNSELING_MANAGE])
  update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateCounselingSessionDto,
  ) {
    return this.service.update(params.id, dto);
  }
}
