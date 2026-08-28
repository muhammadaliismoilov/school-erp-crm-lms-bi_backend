import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { Student } from '../students/entities/student.entity';
import { ReportDateRangeDto } from './dto/reports.dto';
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(FinanceTransaction) private transactions: Repository<FinanceTransaction>,
    @InjectRepository(Contract) private contracts: Repository<Contract>,
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(AttendanceRecord) private attendance: Repository<AttendanceRecord>,
    private readonly tenant: TenantContextService,
  ) {}
  private dateWhere(field: 'date' | 'paymentDate', range: ReportDateRangeDto) { return range.from && range.to ? { [field]: Between(range.from, range.to) } : {}; }
  async cashflow(range: ReportDateRangeDto) {
    // Ko'p-maktabli ajratish: hisobot faqat aktiv maktab/filial bo'yicha.
    const where = tenantWhere<FinanceTransaction>(this.tenant, this.dateWhere('date', range) as FindOptionsWhere<FinanceTransaction>, { branch: true });
    const rows = await this.transactions.find({ where, order: { date: 'ASC' } });
    const income = rows.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, net: income - expense, rows };
  }
  async profitLoss(range: ReportDateRangeDto) { return this.cashflow(range); }
  async paymentsByMethod(range: ReportDateRangeDto) {
    const where = tenantWhere<Payment>(this.tenant, this.dateWhere('paymentDate', range) as FindOptionsWhere<Payment>, { branch: true });
    const rows = await this.payments.find({ where });
    const summary = rows.reduce<Record<string, number>>((acc, p) => { acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount); return acc; }, {});
    return { summary, rows };
  }
  async academicOverview() {
    const [students, contracts, attendance] = await Promise.all([
      this.students.count({ where: tenantWhere<Student>(this.tenant, {}, { branch: true }) }),
      this.contracts.count({ where: tenantWhere<Contract>(this.tenant, {}, { branch: true }) }),
      // Qo'shni ikki qator tenant bilan filtrlangan edi, bu esa unutilgan.
      this.attendance.count({ where: tenantWhere<AttendanceRecord>(this.tenant, {}, { branch: true }) }),
    ]);
    return { students, contracts, attendanceRecords: attendance };
  }
}
