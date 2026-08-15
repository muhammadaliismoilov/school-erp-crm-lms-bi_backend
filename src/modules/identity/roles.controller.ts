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
import { CreateRoleDto } from "./dto/create-role.dto";
import { RoleQueryDto } from "./dto/role-query.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import {
  RoleListResponseSchema,
  RoleResponseSchema,
} from "./swagger/role-response.schema";
import { RolesService } from "./roles.service";

const uuidParamDocs = {
  name: "id",
  description: "Rol IDsi UUID formatida.",
  example: "c9c1df8f-2c6d-4f55-a60a-d29127b3ebd6",
};

@ApiTags("Rollar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "roles", version: "1" })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions([AppPermission.ROLES_READ])
  @ApiOperation({
    summary: "Rollar ro‘yxatini olish",
    description:
      "Rol boshqaruvi jadvali uchun qidirish, sahifalash, role count va permission count bilan qaytaradi.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Rollar ro‘yxati muvaffaqiyatli qaytarildi.",
    type: RoleListResponseSchema,
  })
  async findAll(@Query() query: RoleQueryDto) {
    try {
      return await this.rolesService.findAll(query);
    } catch (error) {
      this.handleError(
        error,
        "Rollar ro‘yxatini olishda server xatosi yuz berdi",
      );
    }
  }

  @Post()
  @Permissions([AppPermission.ROLES_CREATE])
  @ApiOperation({
    summary: "Rol yaratish",
    description:
      "Rol nomi va tanlangan imtiyozlar asosida yangi maxsus rol yaratadi.",
  })
  @ApiBody({
    type: CreateRoleDto,
    examples: {
      salesManager: {
        summary: "Sotuv menejeri roli",
        value: {
          name: "Sales Manager",
          title: {
            uz: "Sotuv menejeri",
            ru: "Менеджер продаж",
            en: "Sales Manager",
          },
          description: { uz: "Sotuv va CRM amallari uchun rol" },
          permissionCodes: ["crm.read", "crm-leads.create", "crm-leads.update", "students.read"],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Rol muvaffaqiyatli yaratildi.",
    type: RoleResponseSchema,
  })
  async create(@Body() dto: CreateRoleDto) {
    try {
      return await this.rolesService.create(dto);
    } catch (error) {
      this.handleError(error, "Rol yaratishda server xatosi yuz berdi");
    }
  }

  @Get(":id")
  @Permissions([AppPermission.ROLES_READ])
  @ApiOperation({ summary: "Rolni ID bo‘yicha olish" })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Rol maʼlumotlari muvaffaqiyatli qaytarildi.",
    type: RoleResponseSchema,
  })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.rolesService.findOne(params.id);
    } catch (error) {
      this.handleError(error, "Rolni olishda server xatosi yuz berdi");
    }
  }

  @Patch(":id")
  @Permissions([AppPermission.ROLES_UPDATE])
  @ApiOperation({
    summary: "Rolni qisman tahrirlash",
    description:
      "Rol nomi, lokalizatsiya izohi va permissionlar ro‘yxatini yangilaydi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Rol muvaffaqiyatli yangilandi.",
    type: RoleResponseSchema,
  })
  async update(@Param() params: UuidParamDto, @Body() dto: UpdateRoleDto) {
    try {
      return await this.rolesService.update(params.id, dto);
    } catch (error) {
      this.handleError(error, "Rolni yangilashda server xatosi yuz berdi");
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.ROLES_DELETE])
  @ApiOperation({
    summary: "Rolni arxivlash",
    description:
      "Maxsus rolni soft-delete qiladi. System rolelar o‘chirilmaydi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Rol arxivlandi. Body qaytmaydi.",
  })
  async remove(@Param() params: UuidParamDto) {
    try {
      await this.rolesService.remove(params.id);
    } catch (error) {
      this.handleError(error, "Rolni arxivlashda server xatosi yuz berdi");
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
