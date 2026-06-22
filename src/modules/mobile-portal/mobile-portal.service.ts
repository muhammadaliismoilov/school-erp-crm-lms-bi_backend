import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { StudentParent } from '../students/entities/student-parent.entity';
import { MealMenu } from '../youth-services/entities/meal-menu.entity';
import { ChildPortalQueryDto } from './dto/mobile-portal.dto';
@Injectable()
export class MobilePortalService {
  constructor(
    @InjectRepository(StudentParent) private studentParents: Repository<StudentParent>,
    @InjectRepository(AttendanceRecord) private attendance: Repository<AttendanceRecord>,
    @InjectRepository(JournalEntry) private journal: Repository<JournalEntry>,
    @InjectRepository(ExamResult) private examResults: Repository<ExamResult>,
    @InjectRepository(Contract) private contracts: Repository<Contract>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(MealMenu) private meals: Repository<MealMenu>,
  ) {}
  findParentChildren(parentId: string) { return this.studentParents.find({ where: { parentId }, relations: { student: true } }); }
  async childOverview(studentId: string) {
    const [attendance, journal, examResults, contracts] = await Promise.all([
      this.attendance.find({ where: { studentId }, order: { date: 'DESC' }, take: 20 }),
      this.journal.find({ where: { studentId }, order: { createdAt: 'DESC' }, take: 20 }),
      this.examResults.find({ where: { studentId }, order: { createdAt: 'DESC' }, take: 20 }),
      this.contracts.find({ where: { studentId }, order: { createdAt: 'DESC' } }),
    ]);
    const contractIds = contracts.map((c) => c.id);
    const payments = contractIds.length ? await this.payments.find({ where: contractIds.map((contractId) => ({ contractId })), order: { paymentDate: 'DESC' } }) : [];
    return { attendance, journal, examResults, contracts, payments };
  }
  findMeals(query: ChildPortalQueryDto) { const where = query.from && query.to ? { menuDate: Between(query.from, query.to) } : {}; return this.meals.find({ where, order: { menuDate: 'DESC' } }); }
}
