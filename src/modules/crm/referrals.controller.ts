import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { AppPermission } from "../../common/constants/permissions";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import type { AuthenticatedUser } from "../../common/security/authenticated-user.interface";
import { CrmActor } from "./crm.service";
import { CreateReferralDto } from "./dto/create-referral.dto";
import { ReferralQueryDto } from "./dto/referral-query.dto";
import { UpdateReferralDto } from "./dto/update-referral.dto";
import { ReferralsService } from "./referrals.service";

@ApiTags("CRM Referallar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "crm/referrals", version: "1" })
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  private buildActor(user: AuthenticatedUser, request: Request): CrmActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  @Get()
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Referallarni stat bilan olish" })
  @ApiOkResponse({ description: "Referallar { items, meta, stats } ko‘rinishida." })
  findReferrals(@Query() query: ReferralQueryDto) {
    return this.referralsService.findReferrals(query);
  }

  @Post()
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Referal (ulashish havolasi) yaratish" })
  @ApiCreatedResponse({ description: "Referal yaratildi, havola qaytdi." })
  createReferral(
    @Body() dto: CreateReferralDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.referralsService.createReferral(dto, this.buildActor(user, request));
  }

  @Get(":id")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Referalni ID bo‘yicha olish" })
  @ApiOkResponse({ description: "Referal qaytarildi." })
  findReferral(@Param() params: UuidParamDto) {
    return this.referralsService.findReferral(params.id);
  }

  @Patch(":id")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Referalni tahrirlash" })
  @ApiOkResponse({ description: "Referal tahrirlandi." })
  updateReferral(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateReferralDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.referralsService.updateReferral(params.id, dto, this.buildActor(user, request));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Referalni o‘chirish (arxivlash)" })
  @ApiNoContentResponse({ description: "Referal o‘chirildi. Body qaytmaydi." })
  deleteReferral(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.referralsService.deleteReferral(params.id, this.buildActor(user, request));
  }
}
