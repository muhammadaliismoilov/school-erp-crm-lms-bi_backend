import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import {
  BalanceStatus,
  computeStudentBalance,
  DiscountType,
} from './billing.util';
import { StudentPayment } from './entities/student-payment.entity';

export interface StudentBalanceQuery {
  search?: string;
  classId?: string;
  status?: BalanceStatus;
  /** Saralash: balans o'sish (`balance`) yoki kamayish (`-balance`). Default: -balance (qarzdor avval). */
  sort?: 'balance' | '-balance';
  page?: number;
  limit?: number;
}

export interface StudentBalanceRow {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  monthlyFee: number;
  effectiveMonthly: number;
  months: number;
  expected: number;
  paid: number;
  balance: number;
  status: BalanceStatus;
}

export interface StudentBalancesResponse {
  items: StudentBalanceRow[];
  meta: { page: number; limit: number; total: number; pageCount: number };
  stats: {
    totalDebt: number;
    totalAdvance: number;
    debtorCount: number;
    advanceCount: number;
  };
}

/**
 * O'quvchilar to'lov balansi (qarz/avans). Har o'quvchi uchun chegirmadan keyingi
 * oylik tarif × o'tgan oylar = kutilgan, undan jami to'langan ayriladi.
 * Hisob `billing.util` sof funksiyalari orqali — UI bilan bir xil natija.
 */
@Injectable()
export class StudentBillingService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(StudentPayment)
    private readonly payments: Repository<StudentPayment>,
  ) {}

  async findBalances(query: StudentBalanceQuery = {}): Promise<StudentBalancesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const now = new Date();

    // 1. Faol o'quvchilar (filtr: sinf, qidiruv).
    const qb = this.students
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.currentClass', 'c')
      .where('s.status = :active', { active: StudentStatus.ACTIVE });

    if (query.classId) {
      qb.andWhere('s.current_class_id = :classId', { classId: query.classId });
    }
    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('s.first_name ILIKE :s', { s: `%${search}%` })
            .orWhere('s.last_name ILIKE :s', { s: `%${search}%` })
            .orWhere('s.student_code ILIKE :s', { s: `%${search}%` });
        }),
      );
    }
    const students = await qb.getMany();

    // 2. Har o'quvchining jami to'lovi — bitta GROUP BY query.
    const paidRows = await this.payments
      .createQueryBuilder('p')
      .select('p.student_id', 'studentId')
      .addSelect('SUM(p.amount)', 'paid')
      .where('p.student_id IS NOT NULL')
      .groupBy('p.student_id')
      .getRawMany<{ studentId: string; paid: string }>();
    const paidMap = new Map(paidRows.map((r) => [r.studentId, Number(r.paid) || 0]));

    // 3. Balansni hisoblaymiz.
    let rows: StudentBalanceRow[] = students.map((student) => {
      const result = computeStudentBalance(
        {
          monthlyFee: Number(student.monthlyFee) || 0,
          discountType: (student.discountType ?? 'percent') as DiscountType,
          discountValue: Number(student.discountValue) || 0,
          billingStart: student.billingStartDate ?? student.createdAt,
          paid: paidMap.get(student.id) ?? 0,
        },
        now,
      );
      return {
        studentId: student.id,
        studentName: `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim() || student.studentCode,
        classId: student.currentClassId ?? null,
        className: this.classLabel(student.currentClass),
        monthlyFee: Number(student.monthlyFee) || 0,
        effectiveMonthly: result.effectiveMonthly,
        months: result.months,
        expected: result.expected,
        paid: result.paid,
        balance: result.balance,
        status: result.status,
      };
    });

    // 4. Stats — filtrlangan to'liq ro'yxatdan (sahifalashdan oldin).
    const stats = {
      totalDebt: rows.filter((r) => r.status === 'debtor').reduce((s, r) => s + Math.abs(r.balance), 0),
      totalAdvance: rows.filter((r) => r.status === 'advance').reduce((s, r) => s + r.balance, 0),
      debtorCount: rows.filter((r) => r.status === 'debtor').length,
      advanceCount: rows.filter((r) => r.status === 'advance').length,
    };

    // 5. Status filtri.
    if (query.status) {
      rows = rows.filter((r) => r.status === query.status);
    }

    // 6. Saralash (default: eng qarzdor avval).
    const dir = query.sort === 'balance' ? 1 : -1;
    rows.sort((a, b) => (a.balance - b.balance) * dir);

    // 7. Sahifalash.
    const total = rows.length;
    const pageCount = Math.ceil(total / limit) || 1;
    const items = rows.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { items, meta: { page, limit, total, pageCount }, stats };
  }

  /** Bitta o'quvchi balansi — detal sahifasi "To'lovlar" tabi uchun. */
  async computeForStudent(studentId: string): Promise<StudentBalanceRow | null> {
    const student = await this.students.findOne({
      where: { id: studentId },
      relations: { currentClass: true },
    });
    if (!student) return null;

    const paidRow = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'paid')
      .where('p.student_id = :studentId', { studentId })
      .getRawOne<{ paid: string }>();

    const result = computeStudentBalance(
      {
        monthlyFee: Number(student.monthlyFee) || 0,
        discountType: (student.discountType ?? 'percent') as DiscountType,
        discountValue: Number(student.discountValue) || 0,
        billingStart: student.billingStartDate ?? student.createdAt,
        paid: Number(paidRow?.paid) || 0,
      },
      new Date(),
    );

    return {
      studentId: student.id,
      studentName: `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim() || student.studentCode,
      classId: student.currentClassId ?? null,
      className: this.classLabel(student.currentClass),
      monthlyFee: Number(student.monthlyFee) || 0,
      effectiveMonthly: result.effectiveMonthly,
      months: result.months,
      expected: result.expected,
      paid: result.paid,
      balance: result.balance,
      status: result.status,
    };
  }

  private classLabel(cls?: SchoolClass | null): string | null {
    if (!cls) return null;
    return cls.name ?? null;
  }
}
