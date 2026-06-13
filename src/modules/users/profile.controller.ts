import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseSchema } from './swagger/user-response.schema';
import { UsersService } from './users.service';

/**
 * "Mening profilim" — joriy (login qilgan) foydalanuvchi o‘z ma'lumotlarini ko‘radi va tahrirlaydi.
 * Maxsus ruxsat talab qilmaydi: har bir autentifikatsiyadan o‘tgan foydalanuvchi o‘z profiliga ega.
 */
@ApiTags('Mening profilim')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard)
@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Joriy foydalanuvchi profilini olish',
    description: 'Login qilgan foydalanuvchining to‘liq shaxsiy ma\'lumotlarini qaytaradi.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profil muvaffaqiyatli qaytarildi.',
    type: UserResponseSchema,
  })
  async me(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.usersService.findOne(user.id);
    } catch (error) {
      this.handleError(error, 'Profilni olishda server xatosi yuz berdi');
    }
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Joriy foydalanuvchi profilini yangilash',
    description:
      'Ism-sharif (lotin/kirill), tug‘ilgan sana, hujjat raqami, jins, telefon, email va profil rasmini yangilaydi. Yuborilmagan maydonlar o‘zgarmaydi.',
  })
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      basic: {
        summary: 'Shaxsiy ma\'lumotlarni yangilash',
        value: {
          firstName: 'Javohir',
          firstNameCyrillic: 'Жавоҳир',
          lastName: 'Aliyev',
          lastNameCyrillic: 'Алиев',
          middleName: 'Valiyevich',
          middleNameCyrillic: 'Валиевич',
          birthDate: '2000-01-15',
          documentNumber: 'AB1234567',
          gender: 'male',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profil muvaffaqiyatli yangilandi.',
    type: UserResponseSchema,
  })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    try {
      return await this.usersService.update(user.id, dto);
    } catch (error) {
      this.handleError(error, 'Profilni yangilashda server xatosi yuz berdi');
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
