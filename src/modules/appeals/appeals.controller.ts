import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import type { AuthenticatedUser } from "../../common/security/authenticated-user.interface";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { AppealQueryDto } from "./dto/appeal-query.dto";
import { AssignAppealDto } from "./dto/assign-appeal.dto";
import { CreateAppealDto } from "./dto/create-appeal.dto";
import { UpdateAppealDto } from "./dto/update-appeal.dto";
import {
  AppealSource,
  AppealStatus,
  AppealType,
  TargetRole,
} from "./entities/appeal.entity";
import { AppealActor, AppealsService } from "./appeals.service";
import {
  AppealListResponseSchema,
  AppealResponseSchema,
} from "./swagger/appeal-response.schema";
import { AppealPublicLinkSchema } from "./swagger/appeal-public-link.schema";

const uuidParamDocs = {
  name: "id",
  description: "Murojaat IDsi UUID formatida.",
  example: "4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1",
};

@ApiTags("Takliflar va shikoyatlar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "appeals", version: "1" })
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Get()
  @Permissions([AppPermission.APPEALS_READ])
  @ApiOperation({
    summary: "Murojaatlar ro‘yxatini olish",
    description:
      "Taklif va shikoyatlarni qidirish, tur, manba, maqsad rol, status va sana filterlari bilan sahifalab qaytaradi. Yuqori kartalar uchun statistikalar ham bor.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Murojaatlar ro‘yxati muvaffaqiyatli qaytarildi.",
    type: AppealListResponseSchema,
  })
  async findAll(@Query() query: AppealQueryDto) {
    try {
      return await this.appealsService.findAll(query);
    } catch (error) {
      this.handleError(
        error,
        "Murojaatlar ro‘yxatini olishda server xatosi yuz berdi",
      );
    }
  }

  @Post()
  @Permissions([AppPermission.APPEALS_CREATE])
  @ApiOperation({
    summary: "Murojaat yaratish",
    description:
      "Rasmdagi forma asosida murojaat yaratadi: murojaat qiluvchi ismi, telefon raqami, taklif/shikoyat turi, maqsad lavozim va batafsil tavsif.",
  })
  @ApiBody({
    type: CreateAppealDto,
    examples: {
      suggestion: {
        summary: "Taklif yaratish",
        value: {
          fullName: "Ali Valiyev",
          phone: "+998901234567",
          type: AppealType.SUGGESTION,
          targetRole: TargetRole.CLASS_TEACHER,
          description: "Sinf xonasi uchun yangi partalar kerak.",
          source: AppealSource.PUBLIC_LINK,
        },
      },
      complaint: {
        summary: "Shikoyat yaratish",
        value: {
          fullName: "Dilnoza Karimova",
          phone: "+998991112233",
          type: AppealType.COMPLAINT,
          targetRole: TargetRole.DIRECTOR,
          description: "To‘lov bo‘yicha murojaatimga javob berilmayapti.",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Murojaat muvaffaqiyatli yaratildi.",
    type: AppealResponseSchema,
  })
  async create(
    @Body() dto: CreateAppealDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.appealsService.create(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, "Murojaat yaratishda server xatosi yuz berdi");
    }
  }

  @Get("public-link")
  @Permissions([AppPermission.APPEALS_PUBLIC_LINK_READ])
  @ApiOperation({
    summary: "Faol public havolani olish",
    description: "Maktab uchun faol public murojaat havolasi (token + URL) yoki bo‘sh holatni qaytaradi.",
  })
  @ApiResponse({ status: HttpStatus.OK, type: AppealPublicLinkSchema })
  async getPublicLink() {
    try {
      return await this.appealsService.getPublicLink();
    } catch (error) {
      this.handleError(error, "Public havolani olishda server xatosi yuz berdi");
    }
  }

  @Post("public-link")
  @Permissions([AppPermission.APPEALS_PUBLIC_LINK_CREATE])
  @ApiOperation({
    summary: "Public havola yaratish / yangilash",
    description:
      "Yangi public murojaat havolasi tokenini yaratadi. Avvalgi faol havola o‘chiriladi (rotatsiya).",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: AppealPublicLinkSchema })
  async createPublicLink(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.appealsService.createPublicLink(user.id);
    } catch (error) {
      this.handleError(error, "Public havola yaratishda server xatosi yuz berdi");
    }
  }

  @Get(":id")
  @Permissions([AppPermission.APPEALS_READ])
  @ApiOperation({
    summary: "Murojaatni ID bo‘yicha olish",
    description:
      "Bitta taklif yoki shikoyatning to‘liq ma’lumotlarini qaytaradi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Murojaat muvaffaqiyatli qaytarildi.",
    type: AppealResponseSchema,
  })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.appealsService.findOne(params.id);
    } catch (error) {
      this.handleError(error, "Murojaatni olishda server xatosi yuz berdi");
    }
  }

  @Patch(":id")
  @Permissions([AppPermission.APPEALS_UPDATE])
  @ApiOperation({
    summary: "Murojaatni qisman tahrirlash",
    description:
      "Murojaat statusi, tavsifi, turi, manbasi yoki maqsad rolini qisman yangilaydi. Yuborilmagan maydonlar o‘zgarishsiz qoladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: UpdateAppealDto,
    examples: {
      status: {
        summary: "Statusni yangilash",
        value: {
          status: AppealStatus.IN_PROGRESS,
          description: "Murojaat mas’ul xodimga biriktirildi.",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Murojaat muvaffaqiyatli tahrirlandi.",
    type: AppealResponseSchema,
  })
  async update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateAppealDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.appealsService.update(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(
        error,
        "Murojaatni tahrirlashda server xatosi yuz berdi",
      );
    }
  }

  @Patch(":id/assign")
  @Permissions([AppPermission.APPEALS_UPDATE])
  @ApiOperation({
    summary: "Murojaatni xodimga biriktirish",
    description:
      "Murojaatni mas’ul xodimga biriktiradi yoki biriktirishni bekor qiladi (assigneeUserId: null). Biriktirilgan xodimga bildirishnoma yuboriladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: AssignAppealDto,
    examples: {
      assign: {
        summary: "Xodimga biriktirish",
        value: { assigneeUserId: "4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1" },
      },
      unassign: {
        summary: "Biriktirishni bekor qilish",
        value: { assigneeUserId: null },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Murojaat biriktirildi.",
    type: AppealResponseSchema,
  })
  async assign(
    @Param() params: UuidParamDto,
    @Body() dto: AssignAppealDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.appealsService.assign(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, "Murojaatni biriktirishda server xatosi yuz berdi");
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.APPEALS_DELETE])
  @ApiOperation({
    summary: "Murojaatni arxivlash",
    description:
      "Murojaatni soft-delete qiladi. Ma’lumot audit va qayta tiklash uchun bazada saqlanadi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Murojaat arxivlandi. Body qaytmaydi.",
  })
  async remove(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.appealsService.remove(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, "Murojaatni arxivlashda server xatosi yuz berdi");
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): AppealActor {
    return { userId: user?.id, ipAddress: request?.ip };
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
