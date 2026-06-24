import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pickLocalizedText } from '../../common/i18n/locale';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { Exam } from '../lms/entities/exam.entity';
import { ExamKind } from '../lms/enums/lms.enums';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import {
  AverageReportQueryDto,
  ProgressExamReportQueryDto,
  QuarterlyReportQueryDto,
} from './dto/progress-report-query.dto';
import {
  AverageReportSchema,
  ProgressExamReportSchema,
  QuarterlyReportSchema,
  ReportPageMetaSchema,
  ReportSubjectSchema,
} from './swagger/progress-report-response.schema';

/** Baholash kategoriyasi chegaralari (5 ballik o'rtacha bo'yicha). */
const ALOCHI_MIN = 4.5;
const YAXSHI_MIN = 3.5;
const QONIQARSIZ_MAX = 3; // o'rtacha < 3 → qoniqarsiz

@Injectable()
export class ProgressReportsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(QuarterSubjectGrade) private readonly quarterGrades: Repository<QuarterSubjectGrade>,
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(ExamResult) private readonly examResults: Repository<ExamResult>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(Quarter) private readonly quarters: Repository<Quarter>,
  ) {}

  /** Tab 1 — O'rtacha o'zlashtirish ko'rsatkichlari. */
  async getAverageReport(query: AverageReportQueryDto): Promise<AverageReportSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const students = await this.loadStudents(query.classId);
    const grades = await this.loadQuarterGrades(students.map((s) => s.id), {
      quarterId: query.quarterId,
    });
    const subjects = this.collectSubjects(grades);

    // student → subject → baho
    const byStudent = this.groupBy(grades, (g) => g.studentId);

    const fullRows = students.map((student) => {
      const studentGrades = byStudent.get(student.id) ?? [];
      const map: Record<string, number | null> = {};
      const values: number[] = [];
      for (const subject of subjects) {
        const match = studentGrades.find((g) => g.subjectId === subject.id);
        const value = this.gradeValue(match);
        map[subject.id] = value;
        if (value !== null) values.push(value);
      }
      return {
        student: { id: student.id, name: this.displayName(student) },
        grades: map,
        average: this.average(values),
      };
    });

    // Footer — har fan bo'yicha sinf o'rtachasi + umumiy
    const subjectAverages: Record<string, number | null> = {};
    const allValues: number[] = [];
    for (const subject of subjects) {
      const vals = fullRows
        .map((r) => r.grades[subject.id])
        .filter((v): v is number => v !== null);
      subjectAverages[subject.id] = this.average(vals);
      allValues.push(...vals);
    }
    const overall = this.average(allValues);

    const stats = this.computeAverageStats(fullRows.map((r) => r.average), overall);
    const total = fullRows.length;
    const rows = fullRows.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { subjects, rows, footer: { subjectAverages, overall }, stats, meta: this.meta(page, limit, total) };
  }

  /** Tab 2 — Choraklik ko'rsatkichlari (fan × chorak matritsasi). */
  async getQuarterlyReport(query: QuarterlyReportQueryDto): Promise<QuarterlyReportSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const students = await this.loadStudents(query.classId);
    const grades = await this.loadQuarterGrades(students.map((s) => s.id), {
      subjectId: query.subjectId,
      quarterId: query.quarterId,
    });

    const subjects = this.collectSubjects(grades);
    const quarters = this.collectQuarters(grades);
    const byStudent = this.groupBy(grades, (g) => g.studentId);

    const fullRows = students.map((student) => {
      const studentGrades = byStudent.get(student.id) ?? [];
      const cells: Record<string, Record<string, number | null>> = {};
      const values: number[] = [];
      for (const subject of subjects) {
        cells[subject.id] = {};
        for (const quarter of quarters) {
          const match = studentGrades.find((g) => g.subjectId === subject.id && g.quarterId === quarter.id);
          const value = this.gradeValue(match);
          cells[subject.id][quarter.id] = value;
          if (value !== null) values.push(value);
        }
      }
      return { student: { id: student.id, name: this.displayName(student) }, cells, average: this.average(values) };
    });

    const total = fullRows.length;
    const rows = fullRows.slice((page - 1) * limit, (page - 1) * limit + limit);
    return { subjects, quarters, rows, meta: this.meta(page, limit, total) };
  }

  /** Tab 3 — Progress imtihon ko'rsatkichlari. */
  async getProgressExamReport(query: ProgressExamReportQueryDto): Promise<ProgressExamReportSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const students = await this.loadStudents(query.classId);
    const results = await this.loadExamResults(students.map((s) => s.id), query);
    const byStudent = this.groupBy(results, (r) => r.studentId);

    const fullRows = students.map((student) => {
      const list = byStudent.get(student.id) ?? [];
      const balls = list.map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
      const bahos = list
        .map((r) => {
          const max = Number(r.exam?.maxScore ?? 100) || 100;
          return (Number(r.score) / max) * 5;
        })
        .filter((n) => Number.isFinite(n));
      return {
        student: { id: student.id, name: this.displayName(student) },
        avgBaho: this.average(bahos),
        avgBall: this.average(balls),
      };
    });

    const allBaho = fullRows.map((r) => r.avgBaho).filter((v): v is number => v !== null);
    const allBall = fullRows.map((r) => r.avgBall).filter((v): v is number => v !== null);

    const total = fullRows.length;
    const rows = fullRows.slice((page - 1) * limit, (page - 1) * limit + limit);
    return {
      rows,
      stats: {
        jamiOquvchilar: total,
        sinfOrtachaBaho: this.average(allBaho),
        sinfOrtachaBall: this.average(allBall),
      },
      meta: this.meta(page, limit, total),
    };
  }

  // --------------------------------------------------------------------------
  // Yuklash
  // --------------------------------------------------------------------------

  /** classId berilmasa — barcha aktiv o'quvchilar ("Barcha sinflar"). */
  private loadStudents(classId?: string): Promise<Student[]> {
    return this.students.find({
      where: {
        status: StudentStatus.ACTIVE,
        ...(classId ? { currentClassId: classId } : {}),
      },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  private loadQuarterGrades(
    studentIds: string[],
    filters: { subjectId?: string; quarterId?: string },
  ): Promise<QuarterSubjectGrade[]> {
    if (studentIds.length === 0) return Promise.resolve([]);
    const qb = this.quarterGrades
      .createQueryBuilder('qsg')
      .leftJoinAndSelect('qsg.subject', 'subject')
      .leftJoinAndSelect('qsg.quarter', 'quarter')
      .where('qsg.student_id IN (:...studentIds)', { studentIds });
    if (filters.subjectId) qb.andWhere('qsg.subject_id = :subjectId', { subjectId: filters.subjectId });
    if (filters.quarterId) qb.andWhere('qsg.quarter_id = :quarterId', { quarterId: filters.quarterId });
    return qb.getMany();
  }

  private loadExamResults(
    studentIds: string[],
    filters: { subjectId?: string; quarterId?: string },
  ): Promise<ExamResult[]> {
    if (studentIds.length === 0) return Promise.resolve([]);
    const qb = this.examResults
      .createQueryBuilder('result')
      .innerJoinAndSelect('result.exam', 'exam')
      .where('result.student_id IN (:...studentIds)', { studentIds })
      .andWhere('exam.exam_kind = :kind', { kind: ExamKind.CLASS });
    if (filters.subjectId) qb.andWhere('exam.subject_id = :subjectId', { subjectId: filters.subjectId });
    if (filters.quarterId) qb.andWhere('exam.quarter_id = :quarterId', { quarterId: filters.quarterId });
    return qb.getMany();
  }

  // --------------------------------------------------------------------------
  // Statistika
  // --------------------------------------------------------------------------

  private computeAverageStats(studentAverages: (number | null)[], overall: number | null) {
    const valid = studentAverages.filter((v): v is number => v !== null);
    const jami = studentAverages.length;
    const alochilar = valid.filter((v) => v >= ALOCHI_MIN).length;
    const yaxshi = valid.filter((v) => v >= YAXSHI_MIN && v < ALOCHI_MIN).length;
    const qoniqarsiz = valid.filter((v) => v < QONIQARSIZ_MAX).length;
    return {
      jamiOquvchilar: jami,
      ortachaBaho: overall,
      alochilar,
      alochilarPercent: this.percent(alochilar, jami),
      yaxshi,
      yaxshiPercent: this.percent(yaxshi, jami),
      qoniqarsiz,
      qoniqarsizPercent: this.percent(qoniqarsiz, jami),
    };
  }

  // --------------------------------------------------------------------------
  // Sof yordamchilar
  // --------------------------------------------------------------------------

  private collectSubjects(grades: QuarterSubjectGrade[]): ReportSubjectSchema[] {
    const map = new Map<string, ReportSubjectSchema>();
    for (const g of grades) {
      if (!g.subjectId || map.has(g.subjectId)) continue;
      map.set(g.subjectId, {
        id: g.subjectId,
        name: g.subject?.name ? pickLocalizedText(g.subject.name, 'uz') : '—',
        color: g.subject?.color ?? '#2563EB',
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private collectQuarters(grades: QuarterSubjectGrade[]) {
    const map = new Map<string, { id: string; quarterNumber: number }>();
    for (const g of grades) {
      if (!g.quarterId || map.has(g.quarterId)) continue;
      map.set(g.quarterId, { id: g.quarterId, quarterNumber: g.quarter?.quarterNumber ?? 0 });
    }
    return [...map.values()].sort((a, b) => a.quarterNumber - b.quarterNumber);
  }

  private gradeValue(grade?: QuarterSubjectGrade | null): number | null {
    if (!grade || grade.grade === null || grade.grade === undefined) return null;
    const n = Number(grade.grade);
    return Number.isFinite(n) ? n : null;
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  private percent(part: number, total: number): number {
    return total === 0 ? 0 : Math.round((part / total) * 100);
  }

  private displayName(student: Student): string {
    return `${student.lastName} ${student.firstName}`.trim();
  }

  private meta(page: number, limit: number, total: number): ReportPageMetaSchema {
    return { page, limit, total, pageCount: Math.ceil(total / limit) || 1 };
  }

  private groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }
}
