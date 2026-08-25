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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateSchoolDto } from "./dto/create-school.dto";
import { SchoolQueryDto } from "./dto/school-query.dto";
import {
  SchoolListResponseEnvelopeDto,
  SchoolResponseEnvelopeDto,
} from "./dto/school-response.dto";
import { UpdateSchoolDto } from "./dto/update-school.dto";
import {
  PaymentPeriodUnit,
  PaymentStartStrategy,
  SchoolType,
  WorkDays,
} from "./enums/school.enums";
import { SchoolsService } from "./schools.service";

const uuidParamDocs = {
  name: "id",
  description: "Maktab IDsi UUID formatida.",
  example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
};

@ApiTags("Maktab maʼlumotlari")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "schools", version: "1" })
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @Permissions([AppPermission.SETTINGS_READ])
  @ApiOperation({
    summary: "Maktablar ro‘yxatini olish",
    description:
      "Maktab boshqaruvi jadvali uchun statistika kartalari, pagination va filterlar bilan qaytaradi.",
  })
  @ApiOkResponse({
    description: "Maktablar ro‘yxati envelope ichida qaytarildi.",
    type: SchoolListResponseEnvelopeDto,
  })
  findSchools(@Query() query: SchoolQueryDto) {
    return this.schoolsService.findSchools(query);
  }

  @Post()
  @Permissions([AppPermission.SETTINGS_SCHOOL_CREATE])
  @ApiOperation({
    summary: "Maktab yaratish",
    description:
      "Maktab formasi: asosiy maʼlumotlar, kontakt, to‘lov, sig‘im va logo maydonlarini yaratadi.",
  })
  @ApiBody({
    type: CreateSchoolDto,
    examples: {
      privateSchool: {
        summary: "Xususiy maktab yaratish",
        value: {
          name: "Toshkent Intellekt Maktabi",
          legalName: "Toshkent Intellekt Xususiy Maktabi MCHJ",
          country: "UZ",
          region: "Toshkent shahri",
          district: "Yunusobod tumani",
          address: "Yunusobod tumani, 4-mavze, 15-uy",
          websiteUrl: "https://intellekt.crm.uz",
          schoolType: SchoolType.PRIVATE,
          email: "info@example.uz",
          phone: "+998712345678",
          monthlyPayment: 1200000,
          paymentStartStrategy: PaymentStartStrategy.FULL_ACADEMIC_YEAR,
          paymentPeriodUnit: PaymentPeriodUnit.YEAR,
          workDays: WorkDays.FIVE_DAYS,
          separateGroupPayments: true,
          groupMonthlyPayments: [{ groupName: "1A", amount: 900000 }],
          totalCapacity: 400,
          elementaryCapacity: 140,
          upperCapacity: 260,
          logoUrl: "https://cdn.example.uz/logo.png",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Maktab yaratildi.",
    type: SchoolResponseEnvelopeDto,
  })
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.createSchool(dto);
  }

  @Get(":id")
  @Permissions([AppPermission.SETTINGS_READ])
  @ApiOperation({ summary: "Maktabni ID bo‘yicha olish" })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "Maktab maʼlumotlari envelope ichida qaytarildi.",
    type: SchoolResponseEnvelopeDto,
  })
  findSchool(@Param() params: UuidParamDto) {
    return this.schoolsService.findSchool(params.id);
  }

  @Patch(":id")
  @Permissions([AppPermission.SETTINGS_SCHOOL_UPDATE])
  @ApiOperation({
    summary: "Maktabni tahrirlash",
    description:
      "Maktab maʼlumotlarini qisman yangilaydi. Sig‘imlar umumiy sig‘imga teng bo‘lishi shart.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: UpdateSchoolDto })
  @ApiOkResponse({
    description: "Maktab tahrirlandi.",
    type: SchoolResponseEnvelopeDto,
  })
  updateSchool(@Param() params: UuidParamDto, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.updateSchool(params.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.SETTINGS_SCHOOL_DELETE])
  @ApiOperation({ summary: "Maktabni arxivlash" })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({ description: "Maktab arxivlandi. Body qaytmaydi." })
  deleteSchool(@Param() params: UuidParamDto) {
    return this.schoolsService.deleteSchool(params.id);
  }
}
