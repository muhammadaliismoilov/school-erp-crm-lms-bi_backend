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
  Put,
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
import { DebtsService } from './debts.service';
import { DebtsQueryDto } from './dto/debts-query.dto';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { PlanPreviewQueryDto, UpdatePaymentPlanConfigDto } from './dto/payment-plan-config.dto';
import { StudentBalanceQueryDto } from './dto/student-balance-query.dto';
import { StudentPaymentQueryDto } from './dto/student-payment-query.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { PaymentPlanService } from './payment-plan.service';
import { StudentBillingService } from './student-billing.service';
import { StudentPaymentActor, StudentPaymentsService } from './student-payments.service';
import {
  StudentPaymentListResponseSchema,
  StudentPaymentOptionsSchema,
  StudentPaymentResponseSchema,
} from './swagger/student-payment-response.schema';

const uuidParamDocs = {
  name: 'id',
  description: 'To‘lov IDsi UUID formatida.',
  example: '4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1',
};

@ApiTags('To‘lovlar')
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'student-payments', version: '1' })
export class StudentPaymentsController {
  constructor(
    private readonly service: StudentPaymentsService,
    private readonly billing: StudentBillingService,
    private readonly plans: PaymentPlanService,
    private readonly debts: DebtsService,
  ) {}

  // ─── Qarzlar (debts) ──────────────────────────────────────────────────────

  @Get('debts/overview')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'Qarzlar: KPI + chart + oylik taqsimot' })
  async debtsOverview() {
    try {
      return await this.debts.getOverview();
    } catch (error) {
      this.handleError(error, 'Qarzlar umumiy ko‘rinishini hisoblashda server xatosi yuz berdi');
    }
  }

  @Get('debts/students')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'O‘quvchilar qarzlari (oylik matritsa, filtr, sahifalash)' })
  async debtsStudents(@Query() query: DebtsQueryDto) {
    try {
      return await this.debts.getStudents(query);
    } catch (error) {
      this.handleError(error, 'O‘quvchilar qarzlarini hisoblashda server xatosi yuz berdi');
    }
  }

  // ─── To'lov rejasi chegirmasi ─────────────────────────────────────────────

  @Get('plan-config')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'To‘lov rejasi chegirma konfiguratsiyasi' })
  async planConfig() {
    try {
      return await this.plans.getConfig();
    } catch (error) {
      this.handleError(error, 'Reja konfiguratsiyasini olishda server xatosi yuz berdi');
    }
  }

  @Put('plan-config')
  @Permissions([AppPermission.STUDENT_PAYMENT_PLANS_UPDATE])
  @ApiOperation({
    summary: 'To‘lov rejasi chegirmasini sozlash',
    description:
      'Invariant: yillik 1 martalik chegirma eng katta, oyma-oy eng kichik (qat‘iy kamayish). Buzilsa 400 qaytadi.',
  })
  async updatePlanConfig(
    @Body() dto: UpdatePaymentPlanConfigDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.plans.updateConfig(dto, { userId: user?.id, username: user?.username, ipAddress: request?.ip });
    } catch (error) {
      this.handleError(error, 'Reja konfiguratsiyasini saqlashda server xatosi yuz berdi');
    }
  }

  @Get('plan-preview')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: '4 rejani solishtirish (jonli preview)' })
  async planPreview(@Query() query: PlanPreviewQueryDto) {
    try {
      const override =
        query.overridePlan && query.overrideType && query.overrideValue != null
          ? { planCode: query.overridePlan, discountType: query.overrideType, discountValue: query.overrideValue }
          : undefined;
      return await this.plans.preview(query.monthlyFee, query.discountType, query.discountValue, query.billingStart, override);
    } catch (error) {
      this.handleError(error, 'Rejalarni solishtirishda server xatosi yuz berdi');
    }
  }

  @Get('balances')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({
    summary: 'O‘quvchilar to‘lov balansi (qarz/avans)',
    description:
      'Har o‘quvchi uchun oylik tarif (chegirmadan keyin) × o‘tgan oylar = kutilgan, undan jami to‘langan ayriladi. Manfiy balans — qarzdor, musbat — avans. Sinf/qidiruv/holat filtri, saralash (default qarzdor avval), sahifalash va umumiy statistika.',
  })
  async balances(@Query() query: StudentBalanceQueryDto) {
    try {
      return await this.billing.findBalances(query);
    } catch (error) {
      this.handleError(error, 'Balanslarni hisoblashda server xatosi yuz berdi');
    }
  }

  @Get('balances/:studentId')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'Bitta o‘quvchi to‘lov balansi (qarz/avans)' })
  async studentBalance(@Param('studentId') studentId: string) {
    try {
      return await this.billing.computeForStudent(studentId);
    } catch (error) {
      this.handleError(error, 'O‘quvchi balansini hisoblashda server xatosi yuz berdi');
    }
  }

  @Get('agreement/:studentId')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'O‘quvchi to‘lov kelishuvi: reja + jadval + keyingi to‘lov' })
  async agreement(@Param('studentId') studentId: string) {
    try {
      return await this.billing.getAgreement(studentId);
    } catch (error) {
      this.handleError(error, 'O‘quvchi to‘lov kelishuvini olishda server xatosi yuz berdi');
    }
  }

  @Get('plan-comparison/:studentId')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'O‘quvchi uchun 4 reja solishtiruvi (tejam ko‘rsatish)' })
  async planComparison(@Param('studentId') studentId: string) {
    try {
      return await this.plans.compareForStudent(studentId);
    } catch (error) {
      this.handleError(error, 'O‘quvchi rejalarini solishtirishda server xatosi yuz berdi');
    }
  }

  @Post('reconcile-transactions')
  @Permissions([AppPermission.STUDENT_PAYMENTS_RECONCILE])
  @ApiOperation({
    summary: 'Moliya defteri proyeksiyalarini qayta sinxronlash (drift tuzatish)',
    description:
      'Har faol o‘quvchi to‘lovi uchun `transactions` proyeksiyasini qayta yozadi — yo‘q bo‘lsa yaratadi, summasi eskirgan bo‘lsa yangilaydi, o‘chirilgan bo‘lsa tiklaydi. Idempotent.',
  })
  async reconcileTransactions() {
    try {
      return await this.service.reconcileFinanceTransactions();
    } catch (error) {
      this.handleError(error, 'Tranzaksiyalarni qayta sinxronlashda server xatosi yuz berdi');
    }
  }

  @Get()
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({
    summary: 'O‘quvchi to‘lovlari ro‘yxati',
    description:
      'O‘quvchi ismi/kvitansiya qidiruvi, oy/yil, to‘lov turi, sinf, holat va sana oralig‘i filterlari bilan sahifalab qaytaradi (10/20/50/100). Stat kartalar uchun oylik reja/yig‘ilgan/qoldiq/bugun to‘langan statistikasi ham bor.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StudentPaymentListResponseSchema })
  async findAll(@Query() query: StudentPaymentQueryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error) {
      this.handleError(error, 'To‘lovlar ro‘yxatini olishda server xatosi yuz berdi');
    }
  }

  @Get('options')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'Dropdownlar uchun to‘lov turlari' })
  @ApiResponse({ status: HttpStatus.OK, type: StudentPaymentOptionsSchema })
  async options() {
    try {
      return await this.service.options();
    } catch (error) {
      this.handleError(error, 'Parametrlarni olishda server xatosi yuz berdi');
    }
  }

  @Get('export')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: 'Filtrlangan to‘lovlarni eksport uchun olish (Excel/CSV)' })
  @ApiResponse({ status: HttpStatus.OK, type: [StudentPaymentResponseSchema] })
  async export(@Query() query: StudentPaymentQueryDto) {
    try {
      return await this.service.export(query);
    } catch (error) {
      this.handleError(error, 'Eksport ma‘lumotini olishda server xatosi yuz berdi');
    }
  }

  @Post()
  @Permissions([AppPermission.STUDENT_PAYMENTS_CREATE])
  @ApiOperation({ summary: 'O‘quvchi to‘lovini yaratish' })
  @ApiResponse({ status: HttpStatus.CREATED, type: StudentPaymentResponseSchema })
  async create(
    @Body() dto: CreateStudentPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.create(dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'To‘lovni yaratishda server xatosi yuz berdi');
    }
  }

  @Get(':id')
  @Permissions([AppPermission.FINANCE_READ])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'To‘lovni ID bo‘yicha olish' })
  @ApiResponse({ status: HttpStatus.OK, type: StudentPaymentResponseSchema })
  async findOne(@Param() params: UuidParamDto) {
    try {
      return await this.service.findOne(params.id);
    } catch (error) {
      this.handleError(error, 'To‘lovni olishda server xatosi yuz berdi');
    }
  }

  @Patch(':id')
  @Permissions([AppPermission.STUDENT_PAYMENTS_UPDATE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'To‘lovni qisman tahrirlash' })
  @ApiResponse({ status: HttpStatus.OK, type: StudentPaymentResponseSchema })
  async update(
    @Param() params: UuidParamDto,
    @Body() dto: UpdateStudentPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      return await this.service.update(params.id, dto, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'To‘lovni tahrirlashda server xatosi yuz berdi');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.STUDENT_PAYMENTS_DELETE])
  @ApiParam(uuidParamDocs)
  @ApiOperation({ summary: 'To‘lovni o‘chirish (soft-delete)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param() params: UuidParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    try {
      await this.service.remove(params.id, this.buildActor(user, request));
    } catch (error) {
      this.handleError(error, 'To‘lovni o‘chirishda server xatosi yuz berdi');
    }
  }

  private buildActor(user: AuthenticatedUser, request: Request): StudentPaymentActor {
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
