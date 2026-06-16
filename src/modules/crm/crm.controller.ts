import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { CrmActor, CrmService } from "./crm.service";
import { EnrollStudentDto } from "../students/dto/enroll-student.dto";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { CreateLeadCommentDto, UpdateLeadCommentDto } from "./dto/lead-comment.dto";
import { CreateLeadTagDto, SetLeadTagsDto, UpdateLeadTagDto } from "./dto/lead-tag.dto";
import { CreateSourceDto } from "./dto/create-source.dto";
import { LeadQueryDto } from "./dto/lead-query.dto";
import { MoveLeadDto } from "./dto/move-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";

@ApiTags("CRM")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "crm", version: "1" })
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  private buildActor(user: AuthenticatedUser, request: Request): CrmActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  // ------------------------------------------------------------------ Leads

  @Get("leads")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "CRM lidlarini stat va kanban hisoblari bilan olish" })
  @ApiOkResponse({ description: "Lidlar { items, meta, stats } ko‘rinishida qaytarildi." })
  findLeads(@Query() query: LeadQueryDto) {
    return this.crmService.findLeads(query);
  }

  @Post("leads")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "CRM lid yaratish" })
  @ApiCreatedResponse({ description: "Lid yaratildi." })
  createLead(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.createLead(dto, this.buildActor(user, request));
  }

  @Get("leads/:id")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Lidni ID bo‘yicha olish" })
  @ApiOkResponse({ description: "Lid qaytarildi." })
  findLead(@Param() params: UuidParamDto) {
    return this.crmService.findLead(params.id);
  }

  @Get("leads/:id/history")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Lid tarixi (kim/qachon yaratgan/o‘zgartirgan)" })
  @ApiOkResponse({ description: "Lid audit timeline'i qaytarildi." })
  findLeadHistory(@Param() params: UuidParamDto) {
    return this.crmService.findLeadHistory(params.id);
  }

  @Patch("leads/:id")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "CRM lidni tahrirlash" })
  @ApiOkResponse({ description: "Lid tahrirlandi." })
  updateLead(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.updateLead(params.id, dto, this.buildActor(user, request));
  }

  @Patch("leads/:id/status")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid holatini o‘zgartirish (kanban ko‘chirish)" })
  @ApiOkResponse({ description: "Lid holati yangilandi." })
  moveLead(
    @Param() params: UuidParamDto,
    @Body() dto: MoveLeadDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.moveLead(params.id, dto, this.buildActor(user, request));
  }

  @Delete("leads/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lidni arxivlash" })
  @ApiNoContentResponse({ description: "Lid arxivlandi. Body qaytmaydi." })
  deleteLead(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.deleteLead(params.id, this.buildActor(user, request));
  }

  @Put("leads/:id/tags")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid teglarini to‘liq almashtirish" })
  @ApiOkResponse({ description: "Lid teglari yangilandi." })
  setLeadTags(
    @Param() params: UuidParamDto,
    @Body() dto: SetLeadTagsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.setLeadTags(params.id, dto.tagIds, this.buildActor(user, request));
  }

  @Post("leads/:id/enroll")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Muvaffaqiyatli (shartnoma) lidni o‘quvchiga aylantirish" })
  @ApiCreatedResponse({ description: "O‘quvchi yaratildi va lidga bog‘landi." })
  enrollLead(
    @Param() params: UuidParamDto,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.enrollLead(params.id, dto, this.buildActor(user, request));
  }

  // --------------------------------------------------------- Lead comments

  @Get("leads/:id/comments")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Lid izohlari (qadalganlar tepada, keyin eng yangisi)" })
  @ApiOkResponse({ description: "Lid izohlari ro‘yxati qaytarildi." })
  findLeadComments(@Param() params: UuidParamDto) {
    return this.crmService.findComments(params.id);
  }

  @Post("leads/:id/comments")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lidga izoh (va ixtiyoriy eslatma) qo‘shish" })
  @ApiCreatedResponse({ description: "Izoh qo‘shildi." })
  addLeadComment(
    @Param() params: UuidParamDto,
    @Body() dto: CreateLeadCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.addComment(params.id, dto, this.buildActor(user, request));
  }

  @Patch("leads/:id/comments/:commentId")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Izohni tahrirlash yoki eslatmani bajarildi deb belgilash" })
  @ApiOkResponse({ description: "Izoh tahrirlandi." })
  updateLeadComment(
    @Param("id", ParseUUIDPipe) leadId: string,
    @Param("commentId", ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateLeadCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.updateComment(leadId, commentId, dto, this.buildActor(user, request));
  }

  @Delete("leads/:id/comments/:commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Izohni o‘chirish (faqat muallifi)" })
  @ApiNoContentResponse({ description: "Izoh o‘chirildi. Body qaytmaydi." })
  deleteLeadComment(
    @Param("id", ParseUUIDPipe) leadId: string,
    @Param("commentId", ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.deleteComment(leadId, commentId, this.buildActor(user, request));
  }

  // ------------------------------------------------------------------- Tags

  @Get("tags")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Lid teglarini olish (lidlar soni bilan)" })
  @ApiOkResponse({ description: "Teglar ro‘yxati qaytarildi." })
  findTags() {
    return this.crmService.findTags();
  }

  @Post("tags")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid tegi yaratish" })
  @ApiCreatedResponse({ description: "Teg yaratildi." })
  createTag(
    @Body() dto: CreateLeadTagDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.createTag(dto, this.buildActor(user, request));
  }

  @Patch("tags/:id")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid tegini tahrirlash" })
  @ApiOkResponse({ description: "Teg tahrirlandi." })
  updateTag(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateLeadTagDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.updateTag(params.id, dto, this.buildActor(user, request));
  }

  @Delete("tags/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid tegini o‘chirish" })
  @ApiNoContentResponse({ description: "Teg o‘chirildi. Body qaytmaydi." })
  deleteTag(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.deleteTag(params.id, this.buildActor(user, request));
  }

  // ---------------------------------------------------------------- Sources

  @Get("sources")
  @Permissions([AppPermission.CRM_READ])
  @ApiOperation({ summary: "Lid manbalarini olish" })
  @ApiOkResponse({ description: "Manbalar ro‘yxati qaytarildi." })
  findSources(@Query("search") search?: string) {
    return this.crmService.findSources(search);
  }

  @Post("sources")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid manbasi yaratish" })
  @ApiCreatedResponse({ description: "Manba yaratildi." })
  createSource(
    @Body() dto: CreateSourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.createSource(dto, this.buildActor(user, request));
  }

  @Patch("sources/:id")
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid manbasini tahrirlash" })
  @ApiOkResponse({ description: "Manba tahrirlandi." })
  updateSource(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateSourceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.updateSource(params.id, dto, this.buildActor(user, request));
  }

  @Delete("sources/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.CRM_MANAGE])
  @ApiOperation({ summary: "Lid manbasini o‘chirish" })
  @ApiNoContentResponse({ description: "Manba o‘chirildi. Body qaytmaydi." })
  deleteSource(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.crmService.deleteSource(params.id, this.buildActor(user, request));
  }
}
