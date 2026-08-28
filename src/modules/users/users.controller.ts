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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import type { AuthenticatedUser } from "../../common/security/authenticated-user.interface";
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ReassignSchoolDto } from "./dto/reassign-school.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { UserManagementRole } from "./enums/user.enums";
import {
  UserListResponseSchema,
  UserResponseSchema,
} from "./swagger/user-response.schema";
import { UsersService } from "./users.service";

const uuidParamDocs = {
  name: "id",
  description: "Foydalanuvchi IDsi UUID formatida.",
  example: "2ec0e170-8249-4c79-9dc7-5ec7faeeb3e9",
};

@ApiTags("Foydalanuvchilar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("by-school")
  @Permissions([AppPermission.USERS_READ])
  @ApiOperation({
    summary: "Maktablar bo‘yicha foydalanuvchi kesimi",
    description:
      "Global hisob (CEO) barcha maktablar qatorlarini oladi; maktabga bog‘langan " +
      "foydalanuvchi faqat o‘z maktabini. Ro‘yxat bilan BIR XIL scoping qoidasi.",
  })
  breakdownBySchool() {
    return this.usersService.breakdownBySchool();
  }

  @Get()
  @Permissions([AppPermission.USERS_READ])
  @ApiOperation({
    summary: "Foydalanuvchilar ro‘yxatini olish",
    description:
      "Qidirish, rol/jins/status filterlari, sahifalash va yuqori kartalar uchun statistikani qaytaradi.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Foydalanuvchilar ro‘yxati muvaffaqiyatli qaytarildi.",
    type: UserListResponseSchema,
  })
  async findAll(@Query() query: UserQueryDto) {
    try {
      return await this.usersService.findAll(query);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchilar ro‘yxatini olishda server xatosi yuz berdi",
      );
    }
  }

  @Post()
  @Permissions([AppPermission.USERS_CREATE])
  @ApiOperation({
    summary: "Foydalanuvchi yaratish",
    description:
      "Rasmdagi forma asosida foydalanuvchi yaratadi: ism-sharif, kirillcha ism-sharif, tug‘ilgan sana, hujjat raqami, jins, telefon, rol va JShShIR.",
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      teacher: {
        summary: "O‘qituvchi yaratish",
        value: {
          username: "javohir.aliyev",
          password: "Str0ng-passphrase!",
          email: "javohir@example.uz",
          profileImageUrl: "https://cdn.example.uz/users/javohir.png",
          firstName: "Javohir",
          firstNameCyrillic: "Жавоҳир",
          lastName: "Aliyev",
          lastNameCyrillic: "Алиев",
          middleName: "Valiyevich",
          middleNameCyrillic: "Валиевич",
          birthDate: "2000-01-15",
          documentNumber: "AB1234567",
          gender: "male",
          phone: "+998901234567",
          role: UserManagementRole.TEACHER,
          pinfl: "12345678901234",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Foydalanuvchi muvaffaqiyatli yaratildi.",
    type: UserResponseSchema,
  })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    try {
      return await this.usersService.create(dto, undefined, actor);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchi yaratishda server xatosi yuz berdi",
      );
    }
  }

  @Get(":id")
  @Permissions([AppPermission.USERS_READ])
  @ApiOperation({
    summary: "Foydalanuvchini ID bo‘yicha olish",
    description:
      "Bitta foydalanuvchining to‘liq profil va role maʼlumotlarini qaytaradi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Foydalanuvchi muvaffaqiyatli qaytarildi.",
    type: UserResponseSchema,
  })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.usersService.findOne(params.id);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchini olishda server xatosi yuz berdi",
      );
    }
  }

  @Patch(":id")
  @Permissions([AppPermission.USERS_UPDATE])
  @ApiOperation({
    summary: "Foydalanuvchini qisman tahrirlash",
    description:
      "Foydalanuvchi profil maydonlari, rol, status va parolni qisman yangilaydi. Yuborilmagan maydonlar saqlanib qoladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      updateRoleAndPhone: {
        summary: "Telefon va rolni yangilash",
        value: {
          phone: "+998991112233",
          role: UserManagementRole.SUPERMANAGER,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Foydalanuvchi muvaffaqiyatli tahrirlandi.",
    type: UserResponseSchema,
  })
  async update(@Param() params: UuidParamDto, @Body() dto: UpdateUserDto) {
    try {
      return await this.usersService.update(params.id, dto);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchini tahrirlashda server xatosi yuz berdi",
      );
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.USERS_UPDATE])
  @ApiOperation({
    summary: "Foydalanuvchini arxivlash",
    description:
      "Foydalanuvchini soft-delete qiladi. Maʼlumot audit va tiklash uchun bazada saqlanadi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Foydalanuvchi arxivlandi. Body qaytmaydi.",
  })
  async remove(@Param() params: UuidParamDto) {
    try {
      await this.usersService.remove(params.id);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchini arxivlashda server xatosi yuz berdi",
      );
    }
  }

  @Patch(":id/roles")
  @Permissions([AppPermission.ROLES_ASSIGN])
  @ApiOperation({
    summary: "Foydalanuvchi rollarini almashtirish",
    description:
      "AuthGuard va Roles/PermissionsGuard ostida foydalanuvchiga bir yoki bir nechta role biriktiradi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: AssignRolesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Foydalanuvchi rollari muvaffaqiyatli yangilandi.",
    type: UserResponseSchema,
  })
  async assignRoles(
    @Param() params: UuidParamDto,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    try {
      return await this.usersService.assignRoles(params.id, dto, actor);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchi rollarini yangilashda server xatosi yuz berdi",
      );
    }
  }

  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  @Permissions([AppPermission.USERS_RESET_PASSWORD])
  @ApiOperation({
    summary: "Foydalanuvchi parolini tiklash (administrator)",
    description:
      "`users.update` dan ataylab ajratilgan amal: parol tiklash o'sha akkaunt " +
      "nomidan kirish bilan barobar. Faqat ruxsatlari aktornikidan oshmaydigan " +
      "foydalanuvchi uchun ishlaydi; o'z paroli uchun /auth/change-password. " +
      "Muvaffaqiyatda nishonning barcha faol sessiyalari bekor qilinadi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Parol tiklandi, faol sessiyalar bekor qilindi.",
  })
  async resetPassword(
    @Param() params: UuidParamDto,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    try {
      return await this.usersService.resetPassword(params.id, dto.password, actor);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchi parolini tiklashda server xatosi yuz berdi",
      );
    }
  }

  @Patch(":id/school")
  @Permissions([AppPermission.USERS_REASSIGN_SCHOOL])
  @ApiOperation({
    summary: "Foydalanuvchini boshqa maktab/filialga ko'chirish",
    description:
      "`users.update` dan ataylab ajratilgan amal: tenant chegarasini kesib " +
      "o'tuvchi yagona amal bo'lgani uchun faqat super-admin ishlata oladi. " +
      "Har bir chaqiruv audit-logga yoziladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({ type: ReassignSchoolDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Foydalanuvchi yangi maktabga/filialga ko'chirildi.",
    type: UserResponseSchema,
  })
  async reassignSchool(
    @Param() params: UuidParamDto,
    @Body() dto: ReassignSchoolDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    try {
      return await this.usersService.reassignSchool(params.id, dto, actor);
    } catch (error) {
      this.handleError(
        error,
        "Foydalanuvchini boshqa maktabga ko'chirishda server xatosi yuz berdi",
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
