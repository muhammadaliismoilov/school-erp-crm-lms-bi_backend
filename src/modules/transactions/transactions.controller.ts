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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PaymentTypeQueryDto } from './dto/payment-type-query.dto';
import { CreatePaymentTypeDto, UpdatePaymentTypeDto } from './dto/upsert-payment-type.dto';
import { PaymentTypeListResponseSchema } from './swagger/payment-type-response.schema';
import {
  CreateTransactionCategoryDto,
  UpdateTransactionCategoryDto,
} from './dto/upsert-transaction-category.dto';
import { TransactionActor, TransactionsService } from './transactions.service';
import {
  TransactionListResponseSchema,
  TransactionOptionsSchema,
  TransactionResponseSchema,
  TransactionStatisticsSchema,
} from './swagger/transaction-response.schema';

const uuidParamDocs = {
  name: 'id',
  description: 'Tranzaksiya IDsi UUID formatida.',
  example: '4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1',
};

@ApiTags('Tranzaksiyalar')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  @Permissions([AppPermission.TRANSACTIONS_READ])
  @ApiOperation({
    summary: 'Tranzaksiyalar ro‘yxati',
    description:
      'Tur, to‘lov turi, kategoriya, shaxs, oy va sana oralig‘i filterlari bilan sahifalab qaytaradi (10/20/50/100). Stat kartalar uchun balans/kirim/chiqim statistikasi ham bor.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionListResponseSchema })
  async findAll(@Query() query: TransactionQueryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error) {
      this.handleError(error, 'Tranzaksiyalar ro‘yxatini olishda server xatosi yuz berdi');
    }
  }

  @Get('statistics')
  @Permissions([AppPermission.TRANSACTIONS_READ])
  @ApiOperation({ summary: 'Statistika (oylik kirim/chiqim, kategoriya va to‘lov turi taqsimoti)' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionStatisticsSchema })
  async statistics(@Query() query: TransactionQueryDto) {
    try {
      return await this.service.statistics(query);
    } catch (error) {
      this.handleError(error, 'Statistikani olishda server xatosi yuz berdi');
    }
  }

  @Get('options')
  @Permissions([AppPermission.TRANSACTIONS_READ])
  @ApiOperation({ summary: 'Dropdownlar uchun to‘lov turlari va kategoriyalar' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionOptionsSchema })
  async options() {
    try {
      return await this.service.options();
    } catch (error) {
      this.handleError(error, 'Parametrlarni olishda server xatosi yuz berdi');
    }
  }

  @Get('export')
  @Permissions([AppPermission.TRANSACTIONS_READ])
  @ApiOperation({ summary: 'Filtrlangan tranzaksiyalarni eksport uchun olish (Excel/CSV)' })
  @ApiResponse({ status: HttpStatus.OK, type: [TransactionResponseSchema] })
  async export(@Query() query: TransactionQueryDto) {
    try {
      return await this.service.export(query);
    } catch (error) {
      this.handleError(error, 'Eksport ma‘lumotini olishda server xatosi yuz berdi');
    }
  }

  // ─── To'lov turlari (dropdown boshqaruvi) ───────────────────────────────

  @Get('payment-types')
  @Permissions([AppPermission.TRANSACTION_PAYMENT_TYPES_READ])
  @ApiOperation({
    summary: 'To‘lov turlari ro‘yxati',
    description: 'Qidiruv va sahifalash (10/20/50/100) bilan, stat kartalar uchun statistika qaytaradi.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentTypeListResponseSchema })
  async listPaymentTypes(@Query() query: PaymentTypeQueryDto) {
    try {
      return await this.service.findPaymentTypes(query);
    } catch (error) {
      this.handleError(error, 'To‘lov turlarini olishda server xatosi yuz berdi');
    }
  }

  @Post('payment-types')
  @Permissions([AppPermission.TRANSACTION_PAYMENT_TYPES_CREATE])
  @ApiOperation({ summary: 'Yangi to‘lov turi qo‘shish' })
  async createPaymentType(
    @Body() dto: CreatePaymentTypeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.createPaymentType(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'To‘lov turini qo‘shishda server xatosi yuz berdi');
    }
  }

  @Patch('payment-types/:id')
  @Permissions([AppPermission.TRANSACTION_PAYMENT_TYPES_UPDATE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'To‘lov turini tahrirlash' })
  async updatePaymentType(
    @Param() params: UuidParamDto,
    @Body() dto: UpdatePaymentTypeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.updatePaymentType(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'To‘lov turini tahrirlashda server xatosi yuz berdi');
    }
  }

  @Delete('payment-types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.TRANSACTION_PAYMENT_TYPES_DELETE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'To‘lov turini o‘chirish (soft-delete)' })
  async removePaymentType(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.service.removePaymentType(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'To‘lov turini o‘chirishda server xatosi yuz berdi');
    }
  }

  // ─── Kategoriyalar (dropdown boshqaruvi) ────────────────────────────────

  @Get('categories')
  @Permissions([AppPermission.TRANSACTION_CATEGORIES_READ])
  @ApiOperation({ summary: 'To‘lov maqsadi (kategoriyalar) ro‘yxati' })
  async listCategories() {
    try {
      return await this.service.listCategories();
    } catch (error) {
      this.handleError(error, 'Kategoriyalarni olishda server xatosi yuz berdi');
    }
  }

  @Post('categories')
  @Permissions([AppPermission.TRANSACTION_CATEGORIES_CREATE])
  @ApiOperation({ summary: 'Yangi kategoriya qo‘shish' })
  async createCategory(
    @Body() dto: CreateTransactionCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.createCategory(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Kategoriya qo‘shishda server xatosi yuz berdi');
    }
  }

  @Patch('categories/:id')
  @Permissions([AppPermission.TRANSACTION_CATEGORIES_UPDATE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'Kategoriyani tahrirlash' })
  async updateCategory(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateTransactionCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.updateCategory(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Kategoriyani tahrirlashda server xatosi yuz berdi');
    }
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.TRANSACTION_CATEGORIES_DELETE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'Kategoriyani o‘chirish (soft-delete)' })
  async removeCategory(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.service.removeCategory(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Kategoriyani o‘chirishda server xatosi yuz berdi');
    }
  }

  // ─── Tranzaksiya CRUD ───────────────────────────────────────────────────

  @Post()
  @Permissions([AppPermission.TRANSACTIONS_CREATE])
  @ApiOperation({ summary: 'Tranzaksiya (kirim/chiqim) yaratish' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TransactionResponseSchema })
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.create(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Tranzaksiya yaratishda server xatosi yuz berdi');
    }
  }

  @Get(':id')
  @Permissions([AppPermission.TRANSACTIONS_READ])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'Tranzaksiyani ID bo‘yicha olish' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionResponseSchema })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.service.findOne(params.id);
    } catch (error) {
      this.handleError(error, 'Tranzaksiyani olishda server xatosi yuz berdi');
    }
  }

  @Patch(':id')
  @Permissions([AppPermission.TRANSACTIONS_UPDATE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'Tranzaksiyani qisman tahrirlash' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionResponseSchema })
  async update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.update(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Tranzaksiyani tahrirlashda server xatosi yuz berdi');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.TRANSACTIONS_DELETE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'Tranzaksiyani o‘chirish (soft-delete)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.service.remove(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'Tranzaksiyani o‘chirishda server xatosi yuz berdi');
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): TransactionActor {
    return {
      userId: user?.id,
      username: user?.username,
      role: user?.roles?.[0],
      permissions: user?.permissions,
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
