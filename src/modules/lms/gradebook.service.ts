import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { LessonPeriod } from '../academic/entities/lesson-period.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { AuditService } from '../audit/audit.service';
import { GamificationService } from '../gamification/gamification.service';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import {
  AwardJournalCoinDto,
  GenerateJournalLessonsDto,
  GradebookQueryDto,
  GradebookResponseDto,
  QuarterGradeDto,
  UpsertGradeDto,
} from './dto/gradebook.dto';
import { JournalEntry } from './entities/journal-entry.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { QuarterSubjectGrade } from './entities/quarter-subject-grade.entity';

const ATTENDED = new Set([AttendanceStatus.PRESENT, AttendanceStatus.LATE]);
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class GradebookService {
  private readonly logger = new Logger(GradebookService.name);

  constructor(
    @InjectRepository(LessonSchedule) private readonly lessons: Repository<LessonSchedule>,
    @InjectRepository(JournalEntry) private readonly journal: Repository<JournalEntry>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Quarter) private readonly quarters: Repository<Quarter>,
    @InjectRepository(QuarterSubjectGrade) private readonly quarterGrades: Repository<QuarterSubjectGrade>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(LessonPeriod) private readonly periods: Repository<LessonPeriod>,
    private readonly gamification: GamificationService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  // ------------------------------------------------------------ Jadval (grid)

  async getGradebook(query: GradebookQueryDto): Promise<GradebookResponseDto> {
    const quarter = await this.loadQuarter(query.quarterId);
    const lessons = await this.lessons.find({
      where: {
        classId: query.classId,
        subjectId: query.subjectId,
        lessonDate: Between(quarter.startDate, quarter.endDate),
      },
      order: { lessonDate: 'ASC' },
    });
    const students = await this.students.find({
      where: { currentClassId: query.classId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    const lessonIds = lessons.map((l) => l.id);
    const entries = lessonIds.length ? await this.journal.find({ where: { lessonId: In(lessonIds) } }) : [];
    const qGrades = await this.quarterGrades.find({
      where: { subjectId: query.subjectId, quarterId: query.quarterId },
    });
    const qByStudent = new Map(qGrades.map((q) => [q.studentId, q] as const));

    // O‘quvchi bo‘yicha baholar va davomat.
    const gradesByStudent = new Map<string, number[]>();
    const attByStudent = new Map<string, { attended: number; total: number }>();
    for (const e of entries) {
      if (e.grade != null) {
        const b = gradesByStudent.get(e.studentId) ?? [];
        b.push(e.grade);
        gradesByStudent.set(e.studentId, b);
      }
      if (e.attendance != null) {
        const a = attByStudent.get(e.studentId) ?? { attended: 0, total: 0 };
        a.total += 1;
        if (ATTENDED.has(e.attendance)) a.attended += 1;
        attByStudent.set(e.studentId, a);
      }
    }

    const studentRows = students.map((s) => {
      const grades = gradesByStudent.get(s.id) ?? [];
      const average = grades.length ? round2(grades.reduce((x, y) => x + y, 0) / grades.length) : null;
      const att = attByStudent.get(s.id);
      const q = qByStudent.get(s.id);
      return {
        id: s.id,
        fullName: `${s.lastName} ${s.firstName}`.trim(),
        studentCode: s.studentCode,
        average,
        attendancePct: att && att.total ? Math.round((att.attended / att.total) * 100) : 100,
        quarterGrade: q?.grade ?? null,
        quarterBall: q?.ball ?? null,
        quarterComment: q?.comment ?? null,
      };
    });

    // Umumiy stats.
    const allGrades = Array.from(gradesByStudent.values()).flat();
    const totals = Array.from(attByStudent.values()).reduce(
      (acc, a) => ({ attended: acc.attended + a.attended, total: acc.total + a.total }),
      { attended: 0, total: 0 },
    );
    const stats = {
      studentCount: students.length,
      lessonCount: lessons.length,
      averageGrade: allGrades.length ? round2(allGrades.reduce((x, y) => x + y, 0) / allGrades.length) : null,
      excellentCount: studentRows.filter((r) => r.average != null && r.average >= 4.5).length,
      attendancePct: totals.total ? Math.round((totals.attended / totals.total) * 100) : 100,
    };

    return {
      lessons: lessons.map((l) => ({ id: l.id, lessonDate: l.lessonDate, topic: l.topic ?? null, status: l.status })),
      students: studentRows,
      cells: entries.map((e) => ({
        lessonId: e.lessonId,
        studentId: e.studentId,
        grade: e.grade ?? null,
        ball: e.ball ?? null,
        attendance: e.attendance ?? null,
        homeworkDone: e.homeworkDone,
        comment: e.comment ?? null,
      })),
      stats,
    };
  }

  // ------------------------------------------------------------ Katak upsert

  async upsertGrade(dto: UpsertGradeDto): Promise<JournalEntry> {
    const lesson = await this.lessons.findOne({ where: { id: dto.lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');

    let entry = await this.journal.findOne({ where: { lessonId: dto.lessonId, studentId: dto.studentId } });
    if (!entry) {
      entry = this.journal.create({ lessonId: dto.lessonId, studentId: dto.studentId, homeworkDone: false });
    }
    if (dto.grade !== undefined) entry.grade = dto.grade;
    if (dto.ball !== undefined) entry.ball = dto.ball;
    if (dto.attendance !== undefined) entry.attendance = dto.attendance;
    if (dto.homeworkDone !== undefined) entry.homeworkDone = dto.homeworkDone;
    if (dto.comment !== undefined) entry.comment = dto.comment;
    return this.journal.save(entry);
  }

  // ------------------------------------------------------------ Choraklik baho

  async setQuarterGrade(dto: QuarterGradeDto): Promise<QuarterSubjectGrade> {
    let row = await this.quarterGrades.findOne({
      where: { studentId: dto.studentId, subjectId: dto.subjectId, quarterId: dto.quarterId },
    });
    if (!row) {
      row = this.quarterGrades.create({
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        quarterId: dto.quarterId,
      });
    }
    if (dto.grade !== undefined) row.grade = dto.grade;
    if (dto.ball !== undefined) row.ball = dto.ball;
    if (dto.comment !== undefined) row.comment = dto.comment;
    return this.quarterGrades.save(row);
  }

  // ------------------------------------------------------------ Darslar generatsiyasi

  async generateLessons(dto: GenerateJournalLessonsDto, actor?: { userId?: string; ipAddress?: string }) {
    const quarter = await this.loadQuarter(dto.quarterId);
    // Mavjud (haftalik) jadval vakillari: shu sinf+fan uchun distinct (weekday, period).
    const existing = await this.lessons.find({
      where: {
        classId: dto.classId,
        subjectId: dto.subjectId,
        lessonDate: Between(quarter.startDate, quarter.endDate),
      },
    });
    const slots = new Map<string, { weekday: number; periodId: string | null; teacherId?: string | null; roomId?: string | null }>();
    for (const l of existing) {
      const weekday = l.weekday ?? this.isoWeekday(l.lessonDate);
      const key = `${weekday}:${l.lessonPeriodId ?? ''}`;
      if (!slots.has(key)) {
        slots.set(key, { weekday, periodId: l.lessonPeriodId ?? null, teacherId: l.teacherId, roomId: l.roomId });
      }
    }
    if (slots.size === 0) {
      throw new BadRequestException('Avval Dars jadvalida ushbu sinf + fan uchun darslar yarating.');
    }
    const haveByKey = new Set(existing.map((l) => `${l.lessonDate}:${l.lessonPeriodId ?? ''}`));
    const rows: LessonSchedule[] = [];
    for (const slot of slots.values()) {
      for (const date of this.enumerateDates(quarter.startDate, quarter.endDate, slot.weekday)) {
        if (haveByKey.has(`${date}:${slot.periodId ?? ''}`)) continue;
        rows.push(
          this.lessons.create({
            classId: dto.classId,
            subjectId: dto.subjectId,
            teacherId: slot.teacherId ?? null,
            roomId: slot.roomId ?? null,
            lessonPeriodId: slot.periodId,
            quarterId: dto.quarterId,
            lessonDate: date,
            weekday: slot.weekday,
          }),
        );
      }
    }
    if (rows.length) await this.lessons.save(rows);
    await this.audit(actor, 'gradebook.lessons_generated', dto.classId, {
      classId: dto.classId,
      subjectId: dto.subjectId,
      quarterId: dto.quarterId,
      created: rows.length,
    });
    return { created: rows.length };
  }

  // ------------------------------------------------------------ O‘quvchi progress

  async getStudentProgress(studentId: string, quarterId?: string) {
    const student = await this.students.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    let range: { start: string; end: string } | null = null;
    if (quarterId) {
      const q = await this.loadQuarter(quarterId);
      range = { start: q.startDate, end: q.endDate };
    }
    const lessonWhere = range
      ? { lessonDate: Between(range.start, range.end) }
      : {};
    const lessons = await this.lessons.find({ where: lessonWhere });
    const lessonSubject = new Map(lessons.map((l) => [l.id, l.subjectId] as const));
    const entries = await this.journal.find({ where: { studentId } });
    const subjectIds = Array.from(new Set(lessons.map((l) => l.subjectId)));
    const subjects = subjectIds.length ? await this.subjects.find({ where: { id: In(subjectIds) } }) : [];
    const subjMap = new Map(subjects.map((s) => [s.id, s.name] as const));

    const bySubject = new Map<string, { grades: number[]; attended: number; total: number }>();
    for (const e of entries) {
      const subjectId = lessonSubject.get(e.lessonId);
      if (!subjectId) continue;
      const agg = bySubject.get(subjectId) ?? { grades: [], attended: 0, total: 0 };
      if (e.grade != null) agg.grades.push(e.grade);
      if (e.attendance != null) {
        agg.total += 1;
        if (ATTENDED.has(e.attendance)) agg.attended += 1;
      }
      bySubject.set(subjectId, agg);
    }

    const subjectsOut = Array.from(bySubject.entries()).map(([subjectId, agg]) => ({
      subjectId,
      name: subjMap.get(subjectId) ?? null,
      average: agg.grades.length ? round2(agg.grades.reduce((x, y) => x + y, 0) / agg.grades.length) : null,
      attendancePct: agg.total ? Math.round((agg.attended / agg.total) * 100) : 100,
    }));

    const allGrades = Array.from(bySubject.values()).flatMap((a) => a.grades);
    const gpa = allGrades.length ? round2(allGrades.reduce((x, y) => x + y, 0) / allGrades.length) : null;
    const graded = subjectsOut.filter((s) => s.average != null);
    const best = graded.reduce<typeof graded[number] | null>((acc, s) => (!acc || (s.average ?? 0) > (acc.average ?? 0) ? s : acc), null);
    const worst = graded.reduce<typeof graded[number] | null>((acc, s) => (!acc || (s.average ?? 99) < (acc.average ?? 99) ? s : acc), null);

    return {
      studentId,
      fullName: `${student.lastName} ${student.firstName}`.trim(),
      gpa,
      currentGpa: gpa,
      progress: gpa != null ? Math.round((gpa / 5) * 100) : 0,
      bestSubject: best,
      worstSubject: worst,
      subjects: subjectsOut,
    };
  }

  // ------------------------------------------------------------ Tanga (gamification wrap)

  listCoinPresets() {
    return this.gamification.findCoinPresets(true);
  }

  async awardCoin(dto: AwardJournalCoinDto) {
    return this.gamification.addTransaction({
      studentId: dto.studentId,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      sourceType: 'journal',
      sourceId: dto.lessonId,
    });
  }

  // ------------------------------------------------------------ Helpers

  private async loadQuarter(id: string): Promise<Quarter> {
    const q = await this.quarters.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Quarter not found');
    return q;
  }

  private isoWeekday(date: string): number {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    return dow === 0 ? 7 : dow;
  }

  private enumerateDates(start: string, end: string, isoWeekday: number): string[] {
    const result: string[] = [];
    const startD = new Date(`${start}T00:00:00Z`);
    const endD = new Date(`${end}T00:00:00Z`);
    for (let d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
      if (dow === isoWeekday) result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }

  private async audit(
    actor: { userId?: string; ipAddress?: string } | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService?.log({ userId: actor?.userId, action, entity: 'gradebook', entityId, ipAddress: actor?.ipAddress, details });
    } catch (error) {
      this.logger.warn(`Failed to write gradebook audit log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
