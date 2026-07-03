import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateFinanceInvoiceDto, UpdateFinanceInvoiceDto, CreateScholarshipDto, UpdateScholarshipDto, CreateRefundDto, UpdateRefundDto, CreateCashboxDto, UpdateCashboxDto, CreateBankTransactionDto, UpdateBankTransactionDto } from './dto/advanced-finance.dto';
import { AdvancedFinanceService } from './advanced-finance.service';

@ApiTags('Advanced Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'advanced-finance', version: '1' })
export class AdvancedFinanceController {
  constructor(private readonly service: AdvancedFinanceService) {}

  @Get('invoices')
  @Permissions([AppPermission.ADVANCED_FINANCE_INVOICES_READ])
  findInvoices() { return this.service.findInvoices(); }

  @Post('invoices')
  @Permissions([AppPermission.ADVANCED_FINANCE_INVOICES_CREATE])
  createInvoices(@Body() dto: CreateFinanceInvoiceDto) { return this.service.createInvoices(dto); }

  @Patch('invoices/:id')
  @Permissions([AppPermission.ADVANCED_FINANCE_INVOICES_UPDATE])
  updateInvoices(@Param() params: UuidParamDto, @Body() dto: UpdateFinanceInvoiceDto) { return this.service.updateInvoices(params.id, dto); }

  @Get('scholarships')
  @Permissions([AppPermission.ADVANCED_FINANCE_SCHOLARSHIPS_READ])
  findScholarships() { return this.service.findScholarships(); }

  @Post('scholarships')
  @Permissions([AppPermission.ADVANCED_FINANCE_SCHOLARSHIPS_CREATE])
  createScholarships(@Body() dto: CreateScholarshipDto) { return this.service.createScholarships(dto); }

  @Patch('scholarships/:id')
  @Permissions([AppPermission.ADVANCED_FINANCE_SCHOLARSHIPS_UPDATE])
  updateScholarships(@Param() params: UuidParamDto, @Body() dto: UpdateScholarshipDto) { return this.service.updateScholarships(params.id, dto); }

  @Get('refunds')
  @Permissions([AppPermission.ADVANCED_FINANCE_REFUNDS_READ])
  findRefunds() { return this.service.findRefunds(); }

  @Post('refunds')
  @Permissions([AppPermission.ADVANCED_FINANCE_REFUNDS_CREATE])
  createRefunds(@Body() dto: CreateRefundDto) { return this.service.createRefunds(dto); }

  @Patch('refunds/:id')
  @Permissions([AppPermission.ADVANCED_FINANCE_REFUNDS_UPDATE])
  updateRefunds(@Param() params: UuidParamDto, @Body() dto: UpdateRefundDto) { return this.service.updateRefunds(params.id, dto); }

  @Get('cashboxes')
  @Permissions([AppPermission.ADVANCED_FINANCE_CASHBOXES_READ])
  findCashboxes() { return this.service.findCashboxes(); }

  @Post('cashboxes')
  @Permissions([AppPermission.ADVANCED_FINANCE_CASHBOXES_CREATE])
  createCashboxes(@Body() dto: CreateCashboxDto) { return this.service.createCashboxes(dto); }

  @Patch('cashboxes/:id')
  @Permissions([AppPermission.ADVANCED_FINANCE_CASHBOXES_UPDATE])
  updateCashboxes(@Param() params: UuidParamDto, @Body() dto: UpdateCashboxDto) { return this.service.updateCashboxes(params.id, dto); }

  @Get('bank-transactions')
  @Permissions([AppPermission.ADVANCED_FINANCE_BANK_TRANSACTIONS_READ])
  findBankTransactions() { return this.service.findBankTransactions(); }

  @Post('bank-transactions')
  @Permissions([AppPermission.ADVANCED_FINANCE_BANK_TRANSACTIONS_CREATE])
  createBankTransactions(@Body() dto: CreateBankTransactionDto) { return this.service.createBankTransactions(dto); }

  @Patch('bank-transactions/:id')
  @Permissions([AppPermission.ADVANCED_FINANCE_BANK_TRANSACTIONS_UPDATE])
  updateBankTransactions(@Param() params: UuidParamDto, @Body() dto: UpdateBankTransactionDto) { return this.service.updateBankTransactions(params.id, dto); }
}
