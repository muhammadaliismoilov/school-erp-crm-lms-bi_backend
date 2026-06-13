import {
  Body,
  Controller,
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
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CrmService } from "./crm.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";

@ApiTags("CRM")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "crm/leads", version: "1" })
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "CRM lidlarini sahifalab olish" })
  @ApiOkResponse({ description: "Lidlar ro‘yxati sahifalab qaytarildi." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.crmService.findLeads(query);
  }

  @Post()
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "CRM lid yaratish" })
  @ApiCreatedResponse({ description: "Lid yaratildi." })
  create(@Body() dto: CreateLeadDto) {
    return this.crmService.createLead(dto);
  }

  @Get(":id")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Lidni ID bo‘yicha olish" })
  @ApiOkResponse({ description: "Lid qaytarildi." })
  findOne(@Param() params: UuidParamDto) {
    return this.crmService.findLead(params.id);
  }

  @Patch(":id")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "CRM lidni tahrirlash" })
  @ApiOkResponse({ description: "Lid tahrirlandi." })
  update(@Param() params: UuidParamDto, @Body() dto: UpdateLeadDto) {
    return this.crmService.updateLead(params.id, dto);
  }
}
