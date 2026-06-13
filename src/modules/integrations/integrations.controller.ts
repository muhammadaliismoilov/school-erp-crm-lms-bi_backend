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
  UseGuards,
} from "@nestjs/common";
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
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateIntegrationDto } from "./dto/create-integration.dto";
import { IntegrationQueryDto } from "./dto/integration-query.dto";
import { UpdateIntegrationDto } from "./dto/update-integration.dto";
import {
  IntegrationCategory,
  IntegrationCode,
  OpenAiModel,
} from "./entities/integration.entity";
import { IntegrationsService } from "./integrations.service";
import {
  IntegrationListResponseSchema,
  IntegrationResponseSchema,
} from "./swagger/integration-response.schema";

const uuidParamDocs = {
  name: "id",
  description: "Integratsiya IDsi UUID formatida.",
  example: "06093488-9fc7-44d7-b552-bd744194621a",
};

@ApiTags("Integratsiyalar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "integrations", version: "1" })
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Permissions([AppPermission.INTEGRATIONS_READ])
  @ApiOperation({
    summary: "Integratsiyalar ro‘yxatini olish",
    description:
      "OpenAI, OnlinePBX va boshqa tashqi xizmat ulanishlarini qidirish, kategoriya va ulanganlik holati bo‘yicha filterlab qaytaradi.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Integratsiyalar ro‘yxati muvaffaqiyatli qaytarildi.",
    type: IntegrationListResponseSchema,
  })
  async findAll(@Query() query: IntegrationQueryDto) {
    try {
      return await this.integrationsService.findAll(query);
    } catch (error) {
      this.handleError(
        error,
        "Integratsiyalar ro‘yxatini olishda server xatosi yuz berdi",
      );
    }
  }

  @Post()
  @Permissions([AppPermission.INTEGRATIONS_MANAGE])
  @ApiOperation({
    summary: "Integratsiya yaratish",
    description:
      "OpenAI yordamchi yoki OnlinePBX telefoniya sozlamalarini yaratadi. Secret maydonlar saqlanadi, lekin response’da maskalanadi.",
  })
  @ApiBody({
    type: CreateIntegrationDto,
    examples: {
      openai: {
        summary: "OpenAI yordamchini sozlash",
        value: {
          name: "OpenAI",
          code: IntegrationCode.OPENAI,
          description: "AI yordamchi va matn generatsiya",
          category: IntegrationCategory.AI_ASSISTANTS,
          isEnabled: true,
          config: {
            apiKey: "sk-proj-...",
            model: OpenAiModel.GPT_4O_MINI,
            enabled: true,
          },
        },
      },
      onlinePbx: {
        summary: "OnlinePBX telefoniya sozlash",
        value: {
          name: "OnlinePBX",
          code: IntegrationCode.ONLINE_PBX,
          description: "Telefoniya va call-center integratsiyasi",
          category: IntegrationCategory.TELEPHONY,
          isEnabled: true,
          config: {
            domain: "u010686",
            apiKey: "pbx-api-secret",
            webhookSecret: "pbx-webhook-secret",
            phoneNumbers: ["+998901234567", "+998712345678"],
            widgetScriptUrl: "https://callback3.onlinepbx.uz/?cb-id=demo",
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Integratsiya muvaffaqiyatli yaratildi.",
    type: IntegrationResponseSchema,
  })
  async create(@Body() dto: CreateIntegrationDto) {
    try {
      return await this.integrationsService.create(dto);
    } catch (error) {
      this.handleError(
        error,
        "Integratsiya yaratishda server xatosi yuz berdi",
      );
    }
  }

  @Get(":id")
  @Permissions([AppPermission.INTEGRATIONS_READ])
  @ApiOperation({
    summary: "Integratsiyani ID bo‘yicha olish",
    description:
      "Bitta integratsiya sozlamalarini qaytaradi. Secret maydonlar maskalangan bo‘ladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Integratsiya ma’lumotlari muvaffaqiyatli qaytarildi.",
    type: IntegrationResponseSchema,
  })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.integrationsService.findOne(params.id);
    } catch (error) {
      this.handleError(error, "Integratsiyani olishda server xatosi yuz berdi");
    }
  }

  @Patch(":id")
  @Permissions([AppPermission.INTEGRATIONS_MANAGE])
  @ApiOperation({
    summary: "Integratsiyani qisman tahrirlash",
    description:
      "API kalit, model, domain, webhook secret, telefonlar yoki ulanganlik holatini qisman yangilaydi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: UpdateIntegrationDto,
    examples: {
      rotateOpenAiKey: {
        summary: "OpenAI API kalitini almashtirish",
        value: {
          config: {
            apiKey: "sk-proj-new-secret",
            model: OpenAiModel.GPT_4O_MINI,
            enabled: true,
          },
        },
      },
      disable: {
        summary: "Integratsiyani o‘chirish",
        value: { isEnabled: false },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Integratsiya muvaffaqiyatli tahrirlandi.",
    type: IntegrationResponseSchema,
  })
  async update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateIntegrationDto,
  ) {
    try {
      return await this.integrationsService.update(params.id, dto);
    } catch (error) {
      this.handleError(
        error,
        "Integratsiyani tahrirlashda server xatosi yuz berdi",
      );
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.INTEGRATIONS_MANAGE])
  @ApiOperation({
    summary: "Integratsiyani arxivlash",
    description:
      "Integratsiyani soft-delete qiladi. Secret va sozlamalar audit uchun bazada saqlanadi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Integratsiya arxivlandi. Body qaytmaydi.",
  })
  async remove(@Param() params: UuidParamDto) {
    try {
      await this.integrationsService.remove(params.id);
    } catch (error) {
      this.handleError(
        error,
        "Integratsiyani arxivlashda server xatosi yuz berdi",
      );
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
