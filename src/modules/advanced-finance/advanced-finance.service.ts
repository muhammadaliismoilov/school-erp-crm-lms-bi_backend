import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { FinanceInvoice } from './entities/finance-invoice.entity';
import { Scholarship } from './entities/scholarship.entity';
import { Refund } from './entities/refund.entity';
import { Cashbox } from './entities/cashbox.entity';
import { BankTransaction } from './entities/bank-transaction.entity';
import { CreateFinanceInvoiceDto, UpdateFinanceInvoiceDto, CreateScholarshipDto, UpdateScholarshipDto, CreateRefundDto, UpdateRefundDto, CreateCashboxDto, UpdateCashboxDto, CreateBankTransactionDto, UpdateBankTransactionDto } from './dto/advanced-finance.dto';

@Injectable()
export class AdvancedFinanceService {
  constructor(@InjectRepository(FinanceInvoice) private readonly invoices: Repository<FinanceInvoice>, @InjectRepository(Scholarship) private readonly scholarships: Repository<Scholarship>, @InjectRepository(Refund) private readonly refunds: Repository<Refund>, @InjectRepository(Cashbox) private readonly cashboxes: Repository<Cashbox>, @InjectRepository(BankTransaction) private readonly banktransactions: Repository<BankTransaction>, private readonly tenant: TenantContextService) {}

  findInvoices() { return this.invoices.find({ where: tenantWhere<FinanceInvoice>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createInvoices(dto: CreateFinanceInvoiceDto) { return this.invoices.save(this.invoices.create(dto)); }
  async updateInvoices(id: string, dto: UpdateFinanceInvoiceDto) { const entity = await this.invoices.preload({ id, ...dto }); if (!entity) throw new NotFoundException('FinanceInvoice not found'); return this.invoices.save(entity); }

  findScholarships() { return this.scholarships.find({ where: tenantWhere<Scholarship>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createScholarships(dto: CreateScholarshipDto) { return this.scholarships.save(this.scholarships.create(dto)); }
  async updateScholarships(id: string, dto: UpdateScholarshipDto) { const entity = await this.scholarships.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Scholarship not found'); return this.scholarships.save(entity); }

  findRefunds() { return this.refunds.find({ where: tenantWhere<Refund>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createRefunds(dto: CreateRefundDto) { return this.refunds.save(this.refunds.create(dto)); }
  async updateRefunds(id: string, dto: UpdateRefundDto) { const entity = await this.refunds.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Refund not found'); return this.refunds.save(entity); }

  findCashboxes() { return this.cashboxes.find({ where: tenantWhere<Cashbox>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createCashboxes(dto: CreateCashboxDto) { return this.cashboxes.save(this.cashboxes.create(dto)); }
  async updateCashboxes(id: string, dto: UpdateCashboxDto) { const entity = await this.cashboxes.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Cashbox not found'); return this.cashboxes.save(entity); }

  findBankTransactions() { return this.banktransactions.find({ where: tenantWhere<BankTransaction>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createBankTransactions(dto: CreateBankTransactionDto) { return this.banktransactions.save(this.banktransactions.create(dto)); }
  async updateBankTransactions(id: string, dto: UpdateBankTransactionDto) { const entity = await this.banktransactions.preload({ id, ...dto }); if (!entity) throw new NotFoundException('BankTransaction not found'); return this.banktransactions.save(entity); }
}
