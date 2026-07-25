import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, IsNull, Repository } from 'typeorm';
import { GradebookService } from '../lms/gradebook.service';
import { GamificationService } from '../gamification/gamification.service';
import { Quarter } from '../academic/entities/quarter.entity';
import { LessonPeriod } from '../academic/entities/lesson-period.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { LessonSchedule } from '../lms/entities/lesson-schedule.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { Payment } from '../finance/entities/payment.entity';
import { User } from '../identity/entities/user.entity';
import { StudentsService } from './students.service';

interface LocalizedText {
  uz?: string;
  ru?: string;
  en?: string;
}

const pickText = (t: LocalizedText | string | null | undefined): string => {
  if (!t) return '';
  if (typeof t === 'string') return t;
  return t.uz ?? t.ru ?? t.en ?? '';
};

@Injectable()
export class StudentProfileService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly gradebook: GradebookService,
    private readonly gamification: GamificationService,
    private readonly dataSource: DataSource,
    @InjectRepository(Quarter)
    private readonly quarters: Repository<Quarter>,
    @InjectRepository(QuarterSubjectGrade)
    private readonly quarterGrades: Repository<QuarterSubjectGrade>,
    @InjectRepository(LessonSchedule)
    private readonly lessons: Repository<LessonSchedule>,
    @InjectRepository(ExamResult)
    private readonly examResults: Repository<ExamResult>,
    @InjectRepository(JournalEntry)
    private readonly journal: Repository<JournalEntry>,
    @InjectRepository(LessonPeriod)
    private readonly lessonPeriods: Repository<LessonPeriod>,
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  // ------------------------------------------------------------ Umumiy ma'lumot

  async getOverview(id: string) {
    const student = await this.studentsService.findStudent(id);
    const progress = await this.gradebook.getStudentProgress(id);
    const wallet = await this.gamification.getWallet(id);

    const attendancePct = progress.subjects.length
      ? Math.round(
          progress.subjects.reduce((s, x) => s + (x.attendancePct ?? 100), 0) /
            progress.subjects.length,
        )
      : 100;

    const { rank, classSize } = await this.computeRank(id, student.currentClassId ?? null);
    const teachers = await this.loadTeachers(student.currentClassId ?? null);

    const parents = (student.parents ?? []).map((sp) => ({
      id: sp.parent.id,
      fullName: `${sp.parent.firstName} ${sp.parent.lastName ?? ''}`.trim(),
      relation: sp.relation,
      phone: sp.parent.phone,
      email: sp.parent.email ?? null,
      isPrimary: sp.isPrimary,
    }));

    return {
      gpa: progress.gpa,
      progress: progress.progress,
      attendancePct,
      coins: wallet.balance,
      rank,
      classSize,
      personal: {
        fullName: `${student.lastName} ${student.firstName}`.trim(),
        middleName: student.middleName ?? null,
        birthDate: student.birthDate ?? null,
        gender: student.gender ?? null,
        language: student.preferredLanguage,
        studentCode: student.studentCode,
        nationalId: student.nationalId ?? null,
        classLabel: student.currentClass
          ? `${student.currentClass.gradeLevel}-${student.currentClass.section}`
          : null,
        contractNumber: student.contractNumber ?? null,
        discountPercent: Number(student.discountPercent ?? 0),
        monthlyFee: Number(student.monthlyFee ?? 0),
        discountType: student.discountType ?? "percent",
        discountValue: Number(student.discountValue ?? 0),
        billingStartDate: student.billingStartDate ?? null,
        region: student.region ?? null,
        district: student.district ?? null,
        address: student.address ?? null,
        personalPhone: student.personalPhone ?? null,
      },
      parents,
      teachers,
      interests: student.interests ?? [],
    };
  }

  /** O‘quvchining sinf ichidagi GPA bo‘yicha o‘rni. */
  private async computeRank(
    studentId: string,
    classId: string | null,
  ): Promise<{ rank: number | null; classSize: number | null }> {
    if (!classId) return { rank: null, classSize: null };

    const rows: { student_id: string; avg: string }[] = await this.dataSource.query(
      `SELECT je.student_id, AVG(je.grade)::numeric AS avg
       FROM lms_journal_entries je
       JOIN lms_lesson_schedules ls ON ls.id = je.lesson_id
       WHERE ls.class_id = $1 AND je.grade IS NOT NULL AND je.deleted_at IS NULL
       GROUP BY je.student_id
       ORDER BY avg DESC`,
      [classId],
    );

    if (!rows.length) return { rank: null, classSize: null };
    const idx = rows.findIndex((r) => r.student_id === studentId);
    return {
      rank: idx >= 0 ? idx + 1 : null,
      classSize: rows.length,
    };
  }

  /** Sinfning dars jadvalidan o‘qituvchilar ro‘yxati (fan bilan). */
  private async loadTeachers(classId: string | null) {
    if (!classId) return [];

    const lessons = await this.lessons.find({
      where: { classId },
      relations: { teacher: { staffMember: true }, subject: true },
    });

    const map = new Map<string, { id: string; fullName: string; subject: string }>();
    for (const l of lessons) {
      if (!l.teacherId || !l.teacher) continue;
      const key = `${l.teacherId}:${l.subjectId}`;
      if (map.has(key)) continue;
      const sm = l.teacher.staffMember;
      map.set(key, {
        id: l.teacherId,
        fullName: sm ? `${sm.lastName} ${sm.firstName}`.trim() : '',
        subject: pickText(l.subject?.name as unknown as LocalizedText),
      });
    }
    return Array.from(map.values());
  }

  // ------------------------------------------------------------ Baholar

  async getGrades(id: string) {
    const student = await this.studentsService.findStudent(id);
    const overall = await this.gradebook.getStudentProgress(id);

    const quarters = await this.quarters.find({ order: { quarterNumber: 'ASC' } });

    // GPA dinamikasi — har bir chorak bo‘yicha
    const gpaDynamics = [];
    for (const q of quarters) {
      const qp = await this.gradebook.getStudentProgress(id, q.id);
      gpaDynamics.push({
        quarterId: q.id,
        number: q.quarterNumber,
        name: pickText(q.name),
        gpa: qp.gpa,
      });
    }

    // Choraklik fan baholari
    const qsg = await this.quarterGrades.find({
      where: { studentId: id },
      relations: { subject: true, quarter: true },
    });

    const subjectMap = new Map<
      string,
      { subjectId: string; name: string; grades: Record<number, number | null> }
    >();
    const distribution = { excellent: 0, good: 0, satisfactory: 0, poor: 0 };

    for (const g of qsg) {
      const entry = subjectMap.get(g.subjectId) ?? {
        subjectId: g.subjectId,
        name: pickText(g.subject?.name as unknown as LocalizedText),
        grades: {},
      };
      const qn = g.quarter?.quarterNumber ?? 0;
      entry.grades[qn] = g.grade ?? null;
      subjectMap.set(g.subjectId, entry);

      if (g.grade === 5) distribution.excellent += 1;
      else if (g.grade === 4) distribution.good += 1;
      else if (g.grade === 3) distribution.satisfactory += 1;
      else if (g.grade != null && g.grade <= 2) distribution.poor += 1;
    }

    // Progress test natijalari
    const results = await this.examResults.find({
      where: { studentId: id },
      relations: { exam: true },
      order: { createdAt: 'DESC' },
    });
    const progressTests = results.map((r) => ({
      examId: r.examId,
      title: r.exam?.title ?? '—',
      date: r.exam?.examDate ?? null,
      score: Number(r.score),
      maxScore: Number(r.exam?.maxScore ?? 100),
    }));

    return {
      studentId: id,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      gpa: overall.gpa,
      progress: overall.progress,
      gpaDynamics,
      subjects: overall.subjects,
      quarterGrades: Array.from(subjectMap.values()),
      quarters: quarters.map((q) => ({ id: q.id, number: q.quarterNumber, name: pickText(q.name) })),
      distribution,
      progressTests,
    };
  }

  // ------------------------------------------------------------ Davomat

  async getAttendance(id: string) {
    await this.studentsService.findStudent(id);

    const entries = await this.journal.find({
      where: { studentId: id, attendance: Not(IsNull()) },
      relations: { lesson: { subject: true } },
      order: { createdAt: 'DESC' },
    });

    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const e of entries) {
      if (e.attendance && e.attendance in counts) {
        counts[e.attendance as keyof typeof counts] += 1;
      }
    }
    const total = entries.length;
    const attended = counts.present + counts.late + counts.excused;
    const attendancePct = total ? Math.round((attended / total) * 100) : 100;

    const recent = entries.slice(0, 30).map((e) => ({
      date: e.lesson?.lessonDate ?? null,
      subject: pickText(e.lesson?.subject?.name as unknown as LocalizedText),
      status: e.attendance,
    }));

    return { total, counts, attendancePct, recent };
  }

  // ------------------------------------------------------------ Jadval (haftalik)

  async getSchedule(id: string) {
    const student = await this.studentsService.findStudent(id);
    if (!student.currentClassId) {
      return { classLabel: null, periods: [], days: [1, 2, 3, 4, 5, 6], cells: [] };
    }

    const lessons = await this.lessons.find({
      where: { classId: student.currentClassId },
      relations: { subject: true, teacher: { staffMember: true }, lessonPeriod: true, room: true },
    });

    const periodMap = new Map<string, LessonPeriod>();
    const cellMap = new Map<
      string,
      { weekday: number; periodId: string; subject: string; teacher: string | null; room: string | null }
    >();

    for (const l of lessons) {
      if (l.weekday == null || !l.lessonPeriodId || !l.lessonPeriod) continue;
      periodMap.set(l.lessonPeriodId, l.lessonPeriod);
      const key = `${l.weekday}:${l.lessonPeriodId}`;
      if (cellMap.has(key)) continue;
      cellMap.set(key, {
        weekday: l.weekday,
        periodId: l.lessonPeriodId,
        subject: pickText(l.subject?.name as unknown as LocalizedText),
        teacher: l.teacher?.staffMember
          ? `${l.teacher.staffMember.lastName} ${l.teacher.staffMember.firstName}`.trim()
          : null,
        room: l.room?.roomNumber ?? null,
      });
    }

    const periods = Array.from(periodMap.values())
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ id: p.id, code: p.code, startTime: p.startTime, endTime: p.endTime }));

    return {
      classLabel: `${student.currentClass?.gradeLevel}-${student.currentClass?.section}`,
      periods,
      days: [1, 2, 3, 4, 5, 6],
      cells: Array.from(cellMap.values()),
    };
  }

  // ------------------------------------------------------------ To'lovlar

  async getPayments(id: string) {
    await this.studentsService.findStudent(id);

    const payments = await this.payments
      .createQueryBuilder('p')
      .innerJoin('p.contract', 'c')
      .where('c.student_id = :id', { id })
      .orderBy('p.payment_date', 'DESC')
      .getMany();

    const items = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.paymentDate,
      method: p.method,
    }));
    const totalPaid = items.reduce((s, p) => s + p.amount, 0);

    return { items, totalPaid };
  }
}
