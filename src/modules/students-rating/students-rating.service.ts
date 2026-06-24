import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { pickLocalizedText } from '../../common/i18n/locale';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import { LeadersQueryDto } from './dto/leaders-query.dto';
import { RatingQueryDto } from './dto/rating-query.dto';
import {
  RatingClassAverageSchema,
  RatingLeaderSchema,
  RatingLeadersResponseSchema,
  RatingListResponseSchema,
  RatingRowSchema,
  RatingSeriesPointSchema,
  RatingStudentDetailSchema,
  RatingSubjectAverageSchema,
  RatingTrend,
} from './swagger/rating-response.schema';

/** Umumiy ball formulasidagi vaznlar (akademik + davomat), baho mavjud bo'lganda. */
const ACADEMIC_WEIGHT = 0.7;
const ATTENDANCE_WEIGHT = 0.3;
/** Kompozit ball shkalasining yuqori chegarasi (UI'dagi maksimum). */
const MAX_SCORE = 25;
/** Davomat statuslarining og'irligi (davomat foizini hisoblashda). */
const ATTENDANCE_WEIGHTS: Record<AttendanceStatus, number> = {
  [AttendanceStatus.PRESENT]: 1,
  [AttendanceStatus.EXCUSED]: 1,
  [AttendanceStatus.LATE]: 0.5,
  [AttendanceStatus.ABSENT]: 0,
};
const UZ_SHORT_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

/** Bitta o'quvchi uchun hisoblangan reyting ko'rsatkichlari. */
interface StudentMetric {
  student: Student;
  classLabel: string | null;
  /** Kompozit umumiy ball (0–25). */
  umumiyBall: number;
  /** O'rtacha 5-ballik baho yoki null (baho yo'q). */
  academicAvg: number | null;
  /** Davomat foizi (0–100). */
  attendancePct: number;
  trend: RatingTrend;
}

interface ResolvedScope {
  year: AcademicYear | null;
  students: Student[];
}

@Injectable()
export class StudentsRatingService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(AcademicYear) private readonly academicYears: Repository<AcademicYear>,
    @InjectRepository(Quarter) private readonly quarters: Repository<Quarter>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(QuarterSubjectGrade) private readonly quarterGrades: Repository<QuarterSubjectGrade>,
    @InjectRepository(JournalEntry) private readonly journal: Repository<JournalEntry>,
    @InjectRepository(ExamResult) private readonly examResults: Repository<ExamResult>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
  ) {}

  /** Reyting jadvali: filtr + pagination + stat kartalar. */
  async getRating(query: RatingQueryDto): Promise<RatingListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const scope = await this.resolveScope(query);
    const metrics = await this.computeMetrics(scope.students);
    const ranked = this.sortByUmumiy(metrics);

    const total = ranked.length;
    const pageCount = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const pageItems = ranked.slice(start, start + limit);

    return {
      items: pageItems.map((m) => this.toRow(m)),
      meta: { page, limit, total, pageCount },
      stats: this.computeStats(ranked),
    };
  }

  /** Liderlar tab: podium (3) + top ro'yxat (10/20). */
  async getLeaders(query: LeadersQueryDto): Promise<RatingLeadersResponseSchema> {
    const limit = query.limit ?? 10;
    const scope = await this.resolveScope(query);
    const metrics = await this.computeMetrics(scope.students);
    const ranked = this.sortByUmumiy(metrics);

    const leaders = ranked.slice(0, limit).map((m, idx) => this.toLeader(m, idx + 1));
    return { podium: leaders.slice(0, 3), leaders };
  }

  /** Sinflar tab: har bir sinf bo'yicha o'rtacha umumiy ball. */
  async getClassAverages(query: Partial<LeadersQueryDto>): Promise<RatingClassAverageSchema[]> {
    const scope = await this.resolveScope({ ...query, classId: undefined });
    const metrics = await this.computeMetrics(scope.students);

    const groups = new Map<string, { label: string; sum: number; count: number }>();
    for (const m of metrics) {
      const classId = m.student.currentClassId;
      if (!classId) continue;
      const entry = groups.get(classId) ?? { label: m.classLabel ?? '—', sum: 0, count: 0 };
      entry.sum += m.umumiyBall;
      entry.count += 1;
      groups.set(classId, entry);
    }

    return [...groups.entries()]
      .map(([classId, g]) => ({
        classId,
        classLabel: g.label,
        avgUmumiyBall: g.count ? Math.round(g.sum / g.count) : 0,
        studentCount: g.count,
      }))
      .sort((a, b) => b.avgUmumiyBall - a.avgUmumiyBall || a.classLabel.localeCompare(b.classLabel));
  }

  /** Fanlar tab: har bir fan bo'yicha o'rtacha choraklik baho. */
  async getSubjectAverages(query: Partial<LeadersQueryDto>): Promise<RatingSubjectAverageSchema[]> {
    const scope = await this.resolveScope(query);
    const studentIds = scope.students.map((s) => s.id);
    if (studentIds.length === 0) return [];

    const grades = await this.loadQuarterGrades(studentIds, scope.year?.id);
    const groups = new Map<string, { subject: Subject | null; sum: number; count: number }>();
    for (const g of grades) {
      if (g.grade === null || g.grade === undefined) continue;
      const entry = groups.get(g.subjectId) ?? { subject: g.subject ?? null, sum: 0, count: 0 };
      entry.sum += Number(g.grade);
      entry.count += 1;
      groups.set(g.subjectId, entry);
    }

    return [...groups.entries()]
      .map(([subjectId, g]) => ({
        subjectId,
        subjectName: g.subject?.name ? pickLocalizedText(g.subject.name, 'uz') : '—',
        avgBall: g.count ? Math.round((g.sum / g.count) * 10) / 10 : 0,
        gradeCount: g.count,
      }))
      .sort((a, b) => b.avgBall - a.avgBall || a.subjectName.localeCompare(b.subjectName));
  }

  /** Bitta o'quvchining to'liq reyting kartasi (modal). */
  async getStudentDetail(studentId: string): Promise<RatingStudentDetailSchema> {
    const student = await this.students.findOne({
      where: { id: studentId },
      relations: { currentClass: true },
    });
    if (!student) {
      throw new NotFoundException('O‘quvchi topilmadi');
    }

    const yearId = student.currentClass?.academicYearId;
    // Sinf ichidagi o'rinni aniqlash uchun sinfdoshlarni hisoblaymiz.
    const classmates = student.currentClassId
      ? await this.students.find({
          where: { currentClassId: student.currentClassId, status: StudentStatus.ACTIVE },
          relations: { currentClass: true },
        })
      : [student];
    const metrics = await this.computeMetrics(classmates);
    const ranked = this.sortByUmumiy(metrics);
    const rankIndex = ranked.findIndex((m) => m.student.id === studentId);
    const self = ranked[rankIndex] ?? (await this.computeMetrics([student]))[0];

    const [monthly, quarterly, progress] = await Promise.all([
      this.buildMonthlyJournalSeries(studentId, yearId),
      this.buildQuarterlyGrades(studentId, yearId),
      this.buildProgressTestSeries(studentId, yearId),
    ]);

    return {
      studentId,
      studentName: this.displayName(student),
      initials: this.initials(student),
      classLabel: self.classLabel,
      rank: rankIndex >= 0 ? rankIndex + 1 : 1,
      level: this.levelLabel(self.umumiyBall),
      umumiyBall: self.umumiyBall,
      ortachaBall: self.academicAvg === null ? 0 : Math.round(self.academicAvg),
      davomat: self.attendancePct,
      trend: self.trend,
      darsBaholariOylik: monthly,
      choraklikBaholar: quarterly,
      progressTest: progress,
    };
  }

  // --------------------------------------------------------------------------
  // Ichki hisoblash
  // --------------------------------------------------------------------------

  /** Filtrlarga mos aktiv o'quvchilarni (va o'quv yilini) yuklaydi. */
  private async resolveScope(query: Partial<RatingQueryDto>): Promise<ResolvedScope> {
    const year = await this.resolveYear(query.academicYearId);

    const qb = this.students
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.currentClass', 'class')
      .where('student.status = :status', { status: StudentStatus.ACTIVE });

    if (year) {
      qb.andWhere('class.academic_year_id = :yearId', { yearId: year.id });
    }
    if (query.gradeLevel) {
      qb.andWhere('class.grade_level = :gradeLevel', { gradeLevel: query.gradeLevel });
    }
    if (query.classId) {
      qb.andWhere('student.current_class_id = :classId', { classId: query.classId });
    }
    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('student.first_name ILIKE :s', { s: `%${search}%` }).orWhere('student.last_name ILIKE :s', {
            s: `%${search}%`,
          });
        }),
      );
    }

    const students = await qb.getMany();
    return { year, students };
  }

  private async resolveYear(academicYearId?: string): Promise<AcademicYear | null> {
    if (academicYearId) {
      return this.academicYears.findOne({ where: { id: academicYearId } });
    }
    return this.academicYears.findOne({ where: { isCurrent: true } });
  }

  /** Berilgan o'quvchilar uchun barcha ko'rsatkichlarni bitta o'qishda hisoblaydi. */
  private async computeMetrics(students: Student[]): Promise<StudentMetric[]> {
    if (students.length === 0) return [];
    const ids = students.map((s) => s.id);
    const yearId = students.find((s) => s.currentClass)?.currentClass?.academicYearId;

    const [grades, attendance, journal] = await Promise.all([
      this.loadQuarterGrades(ids, yearId),
      this.attendance.find({ where: { studentId: In(ids) } }),
      this.loadJournalForTrend(ids, yearId),
    ]);

    const gradesByStudent = this.groupBy(grades, (g) => g.studentId);
    const attendanceByStudent = this.groupBy(attendance, (a) => a.studentId);
    const journalByStudent = this.groupBy(journal, (j) => j.studentId);

    return students.map((student) => {
      const academicAvg = this.averageGrade(gradesByStudent.get(student.id) ?? []);
      const attendancePct = this.attendanceRate(attendanceByStudent.get(student.id) ?? []);
      const umumiyBall = this.compositeScore(academicAvg, attendancePct);
      const trend = this.computeTrend(journalByStudent.get(student.id) ?? []);
      return {
        student,
        classLabel: student.currentClass?.name ?? null,
        umumiyBall,
        academicAvg,
        attendancePct: Math.round(attendancePct),
        trend,
      };
    });
  }

  /**
   * Kompozit umumiy ball (0–25):
   *  - baho mavjud → akademik (0.7) va davomat (0.3) vaznli o'rtachasi;
   *  - baho yo'q  → faqat davomatdan.
   */
  private compositeScore(academicAvg: number | null, attendancePct: number): number {
    const attendanceNorm = (attendancePct / 100) * MAX_SCORE;
    if (academicAvg === null) {
      return Math.round(attendanceNorm);
    }
    const academicNorm = (academicAvg / 5) * MAX_SCORE;
    return Math.round(ACADEMIC_WEIGHT * academicNorm + ATTENDANCE_WEIGHT * attendanceNorm);
  }

  private averageGrade(grades: QuarterSubjectGrade[]): number | null {
    const values = grades
      .map((g) => (g.grade === null || g.grade === undefined ? null : Number(g.grade)))
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /** Davomat foizi. Yozuv bo'lmasa 100% (sababsiz qoldirilmagan deb hisoblanadi). */
  private attendanceRate(records: AttendanceRecord[]): number {
    if (records.length === 0) return 100;
    const sum = records.reduce((acc, r) => acc + (ATTENDANCE_WEIGHTS[r.status] ?? 0), 0);
    return (sum / records.length) * 100;
  }

  /** Trend: oxirgi oy o'rtachasi vs oldingi oy o'rtachasi (jurnal baholari bo'yicha). */
  private computeTrend(entries: JournalEntry[]): RatingTrend {
    const byMonth = new Map<string, { sum: number; count: number }>();
    for (const e of entries) {
      if (e.grade === null || e.grade === undefined) continue;
      const key = this.monthKey(this.entryDate(e));
      if (!key) continue;
      const m = byMonth.get(key) ?? { sum: 0, count: 0 };
      m.sum += Number(e.grade);
      m.count += 1;
      byMonth.set(key, m);
    }
    const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    if (months.length < 2) return 'stable';
    const last = months[months.length - 1][1];
    const prev = months[months.length - 2][1];
    const diff = last.sum / last.count - prev.sum / prev.count;
    if (diff > 0.1) return 'rising';
    if (diff < -0.1) return 'falling';
    return 'stable';
  }

  private computeStats(ranked: StudentMetric[]) {
    const jamiOquvchi = ranked.length;
    const ortachaUmumiyBall = jamiOquvchi
      ? Math.round(ranked.reduce((acc, m) => acc + m.umumiyBall, 0) / jamiOquvchi)
      : 0;
    const rising = ranked.filter((m) => m.trend === 'rising').length;
    const osishTrendi = jamiOquvchi ? Math.round((rising / jamiOquvchi) * 100) : 0;
    return { jamiOquvchi, ortachaUmumiyBall, osishTrendi };
  }

  // --------------------------------------------------------------------------
  // Modal seriyalari
  // --------------------------------------------------------------------------

  private async buildMonthlyJournalSeries(studentId: string, yearId?: string): Promise<RatingSeriesPointSchema[]> {
    const entries = await this.loadJournalForTrend([studentId], yearId);
    const byMonth = new Map<string, { sum: number; count: number }>();
    for (const e of entries) {
      if (e.grade === null || e.grade === undefined) continue;
      const key = this.monthKey(this.entryDate(e));
      if (!key) continue;
      const m = byMonth.get(key) ?? { sum: 0, count: 0 };
      m.sum += Number(e.grade);
      m.count += 1;
      byMonth.set(key, m);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, m]) => ({ key, label: this.monthLabel(key), value: Math.round((m.sum / m.count) * 10) / 10 }));
  }

  private async buildQuarterlyGrades(studentId: string, yearId?: string) {
    const grades = await this.loadQuarterGrades([studentId], yearId);
    return grades
      .filter((g) => g.grade !== null && g.grade !== undefined)
      .map((g) => ({
        quarterNumber: g.quarter?.quarterNumber ?? 0,
        subjectName: g.subject?.name ? pickLocalizedText(g.subject.name, 'uz') : '—',
        grade: g.grade === null || g.grade === undefined ? null : Number(g.grade),
      }))
      .sort((a, b) => a.quarterNumber - b.quarterNumber || a.subjectName.localeCompare(b.subjectName));
  }

  private async buildProgressTestSeries(studentId: string, yearId?: string): Promise<RatingSeriesPointSchema[]> {
    const qb = this.examResults
      .createQueryBuilder('result')
      .innerJoinAndSelect('result.exam', 'exam')
      .where('result.student_id = :studentId', { studentId });
    if (yearId) {
      qb.andWhere('exam.quarter_id IN (SELECT id FROM quarters WHERE academic_year_id = :yearId)', { yearId });
    }
    const results = await qb.getMany();

    const byMonth = new Map<string, { sum: number; count: number }>();
    for (const r of results) {
      const max = Number(r.exam?.maxScore ?? 100) || 100;
      const pct = (Number(r.score) / max) * 100;
      const key = this.monthKey(r.exam?.examDate ?? null);
      if (!key) continue;
      const m = byMonth.get(key) ?? { sum: 0, count: 0 };
      m.sum += pct;
      m.count += 1;
      byMonth.set(key, m);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, m]) => ({ key, label: this.monthLabel(key), value: Math.round(m.sum / m.count) }));
  }

  // --------------------------------------------------------------------------
  // Repozitoriy yordamchilari
  // --------------------------------------------------------------------------

  private loadQuarterGrades(studentIds: string[], yearId?: string): Promise<QuarterSubjectGrade[]> {
    const qb = this.quarterGrades
      .createQueryBuilder('qsg')
      .leftJoinAndSelect('qsg.subject', 'subject')
      .leftJoinAndSelect('qsg.quarter', 'quarter')
      .where('qsg.student_id IN (:...studentIds)', { studentIds });
    if (yearId) {
      qb.andWhere('quarter.academic_year_id = :yearId', { yearId });
    }
    return qb.getMany();
  }

  private loadJournalForTrend(studentIds: string[], yearId?: string): Promise<JournalEntry[]> {
    const qb = this.journal
      .createQueryBuilder('je')
      .leftJoinAndSelect('je.lesson', 'lesson')
      .where('je.student_id IN (:...studentIds)', { studentIds });
    if (yearId) {
      qb.andWhere('lesson.quarter_id IN (SELECT id FROM quarters WHERE academic_year_id = :yearId)', { yearId });
    }
    return qb.getMany();
  }

  // --------------------------------------------------------------------------
  // Sof yordamchilar
  // --------------------------------------------------------------------------

  private sortByUmumiy(metrics: StudentMetric[]): StudentMetric[] {
    return [...metrics].sort(
      (a, b) =>
        b.umumiyBall - a.umumiyBall ||
        b.attendancePct - a.attendancePct ||
        this.displayName(a.student).localeCompare(this.displayName(b.student)),
    );
  }

  private toRow(m: StudentMetric): RatingRowSchema {
    return {
      studentId: m.student.id,
      studentName: this.displayName(m.student),
      initials: this.initials(m.student),
      classId: m.student.currentClassId ?? null,
      classLabel: m.classLabel,
      umumiyBall: m.umumiyBall,
      ortachaBall: m.academicAvg === null ? 0 : Math.round(m.academicAvg),
      davomat: m.attendancePct,
      trend: m.trend,
    };
  }

  private toLeader(m: StudentMetric, rank: number): RatingLeaderSchema {
    return {
      rank,
      studentId: m.student.id,
      studentName: this.displayName(m.student),
      initials: this.initials(m.student),
      classLabel: m.classLabel,
      umumiyBall: m.umumiyBall,
      trend: m.trend,
    };
  }

  private displayName(student: Student): string {
    return `${student.lastName} ${student.firstName}`.trim();
  }

  private initials(student: Student): string {
    const a = student.lastName?.[0] ?? '';
    const b = student.firstName?.[0] ?? '';
    return `${a}${b}`.toUpperCase() || '—';
  }

  private levelLabel(umumiy: number): string {
    if (umumiy >= 23) return 'A’lo';
    if (umumiy >= 20) return 'Yaxshi';
    if (umumiy >= 15) return 'O‘rta';
    return 'Past';
  }

  private entryDate(entry: JournalEntry): string | null {
    return entry.lesson?.lessonDate ?? (entry.createdAt ? entry.createdAt.toISOString().slice(0, 10) : null);
  }

  private monthKey(date: string | null): string | null {
    if (!date) return null;
    return date.slice(0, 7); // YYYY-MM
  }

  private monthLabel(key: string): string {
    const month = Number(key.slice(5, 7));
    return UZ_SHORT_MONTHS[month - 1] ?? key;
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

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim().replace(/\s+/g, ' ');
    return trimmed.length > 0 ? trimmed : null;
  }
}
