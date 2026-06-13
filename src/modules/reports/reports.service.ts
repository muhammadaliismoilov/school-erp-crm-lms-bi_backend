import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
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
  ) {}
  private dateWhere(field: 'date' | 'paymentDate', range: ReportDateRangeDto) { return range.from && range.to ? { [field]: Between(range.from, range.to) } : {}; }
  async cashflow(range: ReportDateRangeDto) {
    const rows = await this.transactions.find({ where: this.dateWhere('date', range), order: { date: 'ASC' } });
    const income = rows.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, net: income - expense, rows };
  }
  async profitLoss(range: ReportDateRangeDto) { return this.cashflow(range); }
  async paymentsByMethod(range: ReportDateRangeDto) {
    const rows = await this.payments.find({ where: this.dateWhere('paymentDate', range) });
    const summary = rows.reduce<Record<string, number>>((acc, p) => { acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount); return acc; }, {});
    return { summary, rows };
  }
  async academicOverview() {
    const [students, contracts, attendance] = await Promise.all([this.students.count(), this.contracts.count(), this.attendance.count()]);
    return { students, contracts, attendanceRecords: attendance };
  }
}
