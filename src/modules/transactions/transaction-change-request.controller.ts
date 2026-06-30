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
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import {
  ChangeRequestQueryDto,
  CreateChangeRequestDto,
  ReviewChangeRequestDto,
} from './dto/change-request.dto';
import {
  ChangeRequestActor,
  TransactionChangeRequestService,
} from './transaction-change-request.service';

const uuidParamDocs = {
  name: 'id',
  description: 'O‘zgartirish so‘rovi IDsi UUID formatida.',
  example: '4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1',
};

@ApiTags('Tranzaksiya o‘zgartirish so‘rovlari')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'transaction-change-requests', version: '1' })
export class TransactionChangeRequestController {
  constructor(private readonly service: TransactionChangeRequestService) {}

  @Get()
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({
    summary: 'Tranzaksiya o‘zgartirish so‘rovlari ro‘yxati',
    description: 'Qidiruv, holat va sana oralig‘i filterlari bilan sahifalab (10/20/50/100) qaytaradi.',
  })
  async findAll(@Query() query: ChangeRequestQueryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error) {
      this.handleError(error, 'So‘rovlar ro‘yxatini olishda server xatosi yuz berdi');
    }
  }

  @Post()
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'Tranzaksiyani tahrirlash/o‘chirish so‘rovini yaratish' })
  async create(
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.create(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rov yaratishda server xatosi yuz berdi');
    }
  }

  @Get(':id')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'So‘rovni ID bo‘yicha olish' })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.service.findOne(params.id);
    } catch (error) {
      this.handleError(error, 'So‘rovni olishda server xatosi yuz berdi');
    }
  }

  @Patch(':id/review')
  @Permissions([AppPermission.FINANCE_MANAGE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({
    summary: 'So‘rovni ko‘rib chiqish (tasdiqlash / rad etish)',
    description: 'Tasdiqlanganda o‘zgarish tranzaksiyaga qo‘llanadi; rad etilganda hech narsa o‘zgarmaydi.',
  })
  async review(
    @Param() params: UuidParamDto,
    @Body() dto: ReviewChangeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.review(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rovni ko‘rib chiqishda server xatosi yuz berdi');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.FINANCE_MANAGE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'So‘rovni o‘chirish (soft-delete)' })
  async remove(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.service.remove(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'So‘rovni o‘chirishda server xatosi yuz berdi');
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): ChangeRequestActor {
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
