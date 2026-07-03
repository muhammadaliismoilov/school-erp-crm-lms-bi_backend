import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import {
  AdjustSalaryDto,
  RecalculateSalaryDto,
  SalaryQueryDto,
  TeacherRateQueryDto,
  UpsertTeacherRateDto,
} from './dto/salary.dto';
import { SalaryActor, SalaryService } from './salary.service';

class TeacherIdParamDto extends UuidParamDto {}

@ApiTags('Maoshlar')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'finance', version: '1' })
export class SalaryController {
  constructor(private readonly service: SalaryService) {}

  // ─── O'qituvchilar uchun dars stavkalari ────────────────────────────────

  @Get('teacher-rates')
  @Permissions([AppPermission.FINANCE_TEACHER_RATES_READ])
  @ApiOperation({
    summary: 'O‘qituvchilar uchun dars stavkalari ro‘yxati',
    description: 'Akademik yil bo‘yicha har bir o‘qituvchining dars boshiga stavkasi. Qidiruv va sahifalash (10/20/50/100).',
  })
  async findTeacherRates(@Query() query: TeacherRateQueryDto) {
    try {
      return await this.service.findTeacherRates(query);
    } catch (error) {
      this.handleError(error, 'Dars stavkalarini olishda server xatosi yuz berdi');
    }
  }

  @Put('teacher-rates/:id')
  @Permissions([AppPermission.FINANCE_TEACHER_RATES_UPDATE])
  @ApiOperation({ summary: 'O‘qituvchi dars stavkasini belgilash/yangilash' })
  async upsertTeacherRate(
    @Param() params: TeacherIdParamDto,
    @Body() dto: UpsertTeacherRateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.upsertTeacherRate(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Dars stavkasini saqlashda server xatosi yuz berdi');
    }
  }

  // ─── Oylik maoshni hisoblash va tasdiqlash ──────────────────────────────

  @Get('salaries')
  @Permissions([AppPermission.FINANCE_SALARIES_READ])
  @ApiOperation({
    summary: 'Oylik maoshlar ro‘yxati (davr bo‘yicha)',
    description: 'Tanlangan oy uchun o‘qituvchilarning yakunlangan darslari, hisoblangan va yakuniy summasi, holati. Sahifalash (10/20/50/100).',
  })
  async findSalaries(@Query() query: SalaryQueryDto) {
    try {
      return await this.service.findSalaries(query);
    } catch (error) {
      this.handleError(error, 'Maoshlar ro‘yxatini olishda server xatosi yuz berdi');
    }
  }

  @Post('salaries/recalculate')
  @Permissions([AppPermission.FINANCE_SALARIES_UPDATE])
  @ApiOperation({
    summary: 'Maoshlarni qayta hisoblash',
    description: 'Tanlangan davrdagi yakunlangan darslarni qayta sanab, tasdiqlanmagan maoshlarni qayta hisoblaydi.',
  })
  async recalculate(
    @Body() dto: RecalculateSalaryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.recalculate(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Maoshlarni qayta hisoblashda server xatosi yuz berdi');
    }
  }

  @Patch('salaries/:id/adjust')
  @Permissions([AppPermission.FINANCE_SALARIES_UPDATE])
  @ApiOperation({ summary: 'O‘qituvchi maoshini qo‘lda tuzatish' })
  async adjust(
    @Param() params: UuidParamDto,
    @Body() dto: AdjustSalaryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.adjust(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Maoshni tuzatishda server xatosi yuz berdi');
    }
  }

  @Post('salaries/:id/approve')
  @Permissions([AppPermission.FINANCE_SALARIES_UPDATE])
  @ApiOperation({
    summary: 'O‘qituvchi maoshini tasdiqlash',
    description: 'Maoshni tasdiqlaydi va yakuniy summa musbat bo‘lsa moliyaviy chiqim (transaction) yozadi.',
  })
  async approve(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.approve(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Maoshni tasdiqlashda server xatosi yuz berdi');
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): SalaryActor {
    return {
      userId: user?.id,
      username: user?.username,
      role: user?.roles?.[0],
      ipAddress: request?.ip,
    };
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(fallbackMessage);
  }
}
