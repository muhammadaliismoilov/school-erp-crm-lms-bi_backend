import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Course } from '../academic/entities/course.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import type { LocalizedText } from '../../common/i18n/locale';
import { User } from '../identity/entities/user.entity';
import {
  CreateClassExamDto,
  CreateCourseExamDto,
  ExamListResponseDto,
  ExamQueryDto,
  ExamResponseDto,
  ExamStatsDto,
  UpdateExamDto,
} from './dto/exam.dto';
import { Exam } from './entities/exam.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { ExamKind, ExamStatus, ExamType } from './enums/lms.enums';

export interface ExamActor {
  userId?: string;
  ipAddress?: string;
}

const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  [ExamType.TEST]: 'Test',
  [ExamType.CONTROL_WORK]: 'Nazorat ishi',
  [ExamType.DICTATION]: 'Diktant',
};

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(SchoolClass) private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Quarter) private readonly quarters: Repository<Quarter>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LessonSchedule) private readonly lessons: Repository<LessonSchedule>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  // ============================================================ Selektorlar

  async getOptions() {
    const [subjects, classes, courses, quarters, teachers] = await Promise.all([
      this.subjects.find({ order: { normalizedName: 'ASC' } }),
      this.classes.find({ order: { gradeLevel: 'ASC', section: 'ASC' } }),
      this.courses.find({ relations: { subject: true, teacher: true }, order: { normalizedName: 'ASC' } }),
      this.quarters.find({ order: { quarterNumber: 'ASC' } }),
      this.users.find({ order: { firstName: 'ASC', lastName: 'ASC' } }),
    ]);
    return {
      subjects: subjects.map((s) => ({ id: s.id, name: s.name, color: s.color })),
      classes: classes.map((c) => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, section: c.section })),
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        subjectName: c.subject?.name ?? null,
        teacherName: c.teacher ? this.fullName(c.teacher) : null,
      })),
      quarters: quarters.map((q) => ({ id: q.id, name: q.name, quarterNumber: q.quarterNumber })),
      teachers: teachers.map((u) => ({ id: u.id, fullName: this.fullName(u) })),
    };
  }

  /**
   * Imtihon tayinlash formasi uchun o'qituvchilar.
   * Sinf + fan berilsa, shu sinfga shu fandan dars beradigan o'qituvchilarni
   * (dars jadvalidan) qaytaramiz; topilmasa — barcha foydalanuvchilar.
   */
  async getTeachers(classId?: string, subjectId?: string) {
    if (classId && subjectId) {
      const lessons = await this.lessons.find({
        where: { classId, subjectId },
        relations: { teacher: true },
      });
      const byId = new Map<string, User>();
      for (const lesson of lessons) {
        if (lesson.teacher) byId.set(lesson.teacher.id, lesson.teacher);
      }
      if (byId.size > 0) {
        return {
          items: Array.from(byId.values())
            .map((u) => ({ id: u.id, fullName: this.fullName(u) }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
        };
      }
    }
    const users = await this.users.find({ order: { firstName: 'ASC', lastName: 'ASC' } });
    return { items: users.map((u) => ({ id: u.id, fullName: this.fullName(u) })) };
  }

  // ============================================================ Yaratish

  async createClassExam(dto: CreateClassExamDto, actor?: ExamActor): Promise<ExamResponseDto> {
    const [schoolClass, subject, teacher, quarter] = await Promise.all([
      this.classes.findOne({ where: { id: dto.classId } }),
      this.subjects.findOne({ where: { id: dto.subjectId } }),
      this.users.findOne({ where: { id: dto.teacherId } }),
      this.quarters.findOne({ where: { id: dto.quarterId } }),
    ]);
    if (!schoolClass) throw new NotFoundException(this.msg('Sinf topilmadi', 'Класс не найден', 'Class not found'));
    if (!subject) throw new NotFoundException(this.msg('Fan topilmadi', 'Предмет не найден', 'Subject not found'));
    if (!teacher) throw new NotFoundException(this.msg("O'qituvchi topilmadi", 'Учитель не найден', 'Teacher not found'));
    if (!quarter) throw new NotFoundException(this.msg('Chorak topilmadi', 'Четверть не найдена', 'Quarter not found'));

    const { availableFrom, availableUntil } = this.normalizeWindow(dto.availableFrom, dto.availableUntil);
    const title = dto.title?.trim() || this.classTitle(subject.name, dto.examType, schoolClass.name);

    const exam = this.exams.create({
      title,
      examKind: ExamKind.CLASS,
      examType: dto.examType,
      classId: dto.classId,
      subjectId: dto.subjectId,
      teacherId: dto.teacherId,
      quarterId: dto.quarterId,
      courseId: null,
      examDate: dto.examDate,
      availableFrom,
      availableUntil,
      maxScore: dto.maxScore ?? 100,
      status: dto.status ?? ExamStatus.DRAFT,
    });
    const saved = await this.exams.save(exam);
    await this.audit(actor, 'exam.class_created', saved.id, { classId: dto.classId, subjectId: dto.subjectId });
    return this.findExam(saved.id);
  }

  async createCourseExam(dto: CreateCourseExamDto, actor?: ExamActor): Promise<ExamResponseDto> {
    const [course, quarter] = await Promise.all([
      this.courses.findOne({ where: { id: dto.courseId }, relations: { subject: true, teacher: true } }),
      this.quarters.findOne({ where: { id: dto.quarterId } }),
    ]);
    if (!course) throw new NotFoundException(this.msg('Kurs topilmadi', 'Курс не найден', 'Course not found'));
    if (!quarter) throw new NotFoundException(this.msg('Chorak topilmadi', 'Четверть не найдена', 'Quarter not found'));

    const { availableFrom, availableUntil } = this.normalizeWindow(dto.availableFrom, dto.availableUntil);
    const title = dto.title?.trim() || `${course.name} — ${EXAM_TYPE_LABEL[dto.examType]}`;

    const exam = this.exams.create({
      title,
      examKind: ExamKind.COURSE,
      examType: dto.examType,
      courseId: dto.courseId,
      quarterId: dto.quarterId,
      classId: null,
      subjectId: null,
      teacherId: null,
      examDate: dto.examDate,
      availableFrom,
      availableUntil,
      maxScore: dto.maxScore ?? 100,
      status: dto.status ?? ExamStatus.DRAFT,
    });
    const saved = await this.exams.save(exam);
    await this.audit(actor, 'exam.course_created', saved.id, { courseId: dto.courseId });
    return this.findExam(saved.id);
  }

  // ============================================================ O'qish

  async findExams(query: ExamQueryDto = {}): Promise<ExamListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const where = this.buildWhere(query);

    const [items, total] = await this.exams.findAndCount({
      where,
      relations: this.relations(),
      skip: (page - 1) * limit,
      take: limit,
      order: { examDate: 'DESC', createdAt: 'DESC' },
    });

    return {
      items: items.map((exam) => this.toResponse(exam)),
      stats: await this.buildStats(where),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findExam(id: string): Promise<ExamResponseDto> {
    const exam = await this.exams.findOne({ where: { id }, relations: this.relations() });
    if (!exam) throw new NotFoundException(this.msg('Imtihon topilmadi', 'Экзамен не найден', 'Exam not found'));
    return this.toResponse(exam);
  }

  // ============================================================ Yangilash / o'chirish

  async updateExam(id: string, dto: UpdateExamDto, actor?: ExamActor): Promise<ExamResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        this.msg('Kamida bitta maydon berilishi kerak', 'Нужно указать хотя бы одно поле', 'At least one field is required'),
      );
    }
    const exam = await this.exams.findOne({ where: { id } });
    if (!exam) throw new NotFoundException(this.msg('Imtihon topilmadi', 'Экзамен не найден', 'Exam not found'));

    if (dto.classId !== undefined) await this.assertExists(this.classes, dto.classId, 'Sinf topilmadi');
    if (dto.subjectId !== undefined) await this.assertExists(this.subjects, dto.subjectId, 'Fan topilmadi');
    if (dto.teacherId !== undefined) await this.assertExists(this.users, dto.teacherId, "O'qituvchi topilmadi");
    if (dto.courseId !== undefined) await this.assertExists(this.courses, dto.courseId, 'Kurs topilmadi');
    if (dto.quarterId !== undefined) await this.assertExists(this.quarters, dto.quarterId, 'Chorak topilmadi');

    const from = dto.availableFrom !== undefined ? dto.availableFrom : exam.availableFrom?.toISOString();
    const until = dto.availableUntil !== undefined ? dto.availableUntil : exam.availableUntil?.toISOString();
    const { availableFrom, availableUntil } = this.normalizeWindow(from ?? undefined, until ?? undefined);

    Object.assign(exam, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.examType !== undefined ? { examType: dto.examType } : {}),
      ...(dto.classId !== undefined ? { classId: dto.classId } : {}),
      ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId } : {}),
      ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
      ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
      ...(dto.quarterId !== undefined ? { quarterId: dto.quarterId } : {}),
      ...(dto.examDate !== undefined ? { examDate: dto.examDate } : {}),
      ...(dto.maxScore !== undefined ? { maxScore: dto.maxScore } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      availableFrom,
      availableUntil,
    });

    await this.exams.save(exam);
    await this.audit(actor, 'exam.updated', id, { changed: Object.keys(dto) });
    return this.findExam(id);
  }

  async publishExam(id: string, actor?: ExamActor): Promise<ExamResponseDto> {
    const exam = await this.exams.findOne({ where: { id } });
    if (!exam) throw new NotFoundException(this.msg('Imtihon topilmadi', 'Экзамен не найден', 'Exam not found'));
    if (exam.status !== ExamStatus.DRAFT) {
      throw new ConflictException(
        this.msg(
          'Faqat qoralama imtihonni tayyor holatga keltirish mumkin',
          'Опубликовать можно только черновик',
          'Only draft exams can be published',
        ),
      );
    }
    exam.status = ExamStatus.SCHEDULED;
    await this.exams.save(exam);
    await this.audit(actor, 'exam.published', id);
    return this.findExam(id);
  }

  async deleteExam(id: string, actor?: ExamActor): Promise<void> {
    const exam = await this.exams.findOne({ where: { id }, relations: { results: true } });
    if (!exam) throw new NotFoundException(this.msg('Imtihon topilmadi', 'Экзамен не найден', 'Exam not found'));
    if ((exam.results ?? []).length > 0) {
      throw new ConflictException(
        this.msg(
          'Natija kiritilgan imtihonni o‘chirib bo‘lmaydi',
          'Нельзя удалить экзамен с результатами',
          'Cannot delete an exam that has results',
        ),
      );
    }
    if (exam.status === ExamStatus.FINISHED) {
      throw new ConflictException(
        this.msg('Yakunlangan imtihonni o‘chirib bo‘lmaydi', 'Нельзя удалить завершённый экзамен', 'Cannot delete a finished exam'),
      );
    }
    await this.exams.softDelete(id);
    await this.audit(actor, 'exam.deleted', id, { title: exam.title });
  }

  // ============================================================ Helpers

  private relations() {
    return {
      class: true,
      subject: true,
      teacher: true,
      quarter: true,
      course: { subject: true, teacher: true },
      results: true,
    } as const;
  }

  private buildWhere(query: ExamQueryDto): FindOptionsWhere<Exam> | FindOptionsWhere<Exam>[] {
    const examDate =
      query.dateFrom && query.dateTo
        ? Between(query.dateFrom, query.dateTo)
        : query.dateFrom
          ? MoreThanOrEqual(query.dateFrom)
          : query.dateTo
            ? LessThanOrEqual(query.dateTo)
            : undefined;

    const base: FindOptionsWhere<Exam> = {
      ...(query.kind ? { examKind: query.kind } : {}),
      ...(query.quarterId ? { quarterId: query.quarterId } : {}),
      ...(query.quarterNumber ? { quarter: { quarterNumber: query.quarterNumber } } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.examType ? { examType: query.examType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(examDate ? { examDate } : {}),
    };

    const search = query.search?.trim();
    if (!search) return base;
    return { ...base, title: ILike(`%${search}%`) };
  }

  private async buildStats(
    where: FindOptionsWhere<Exam> | FindOptionsWhere<Exam>[],
  ): Promise<ExamStatsDto> {
    const exams = await this.exams.find({ where, relations: { results: true } });
    const stats: ExamStatsDto = { total: exams.length, draft: 0, scheduled: 0, finished: 0, withResults: 0 };
    for (const exam of exams) {
      if (exam.status === ExamStatus.DRAFT) stats.draft += 1;
      else if (exam.status === ExamStatus.SCHEDULED) stats.scheduled += 1;
      else if (exam.status === ExamStatus.FINISHED) stats.finished += 1;
      if ((exam.results ?? []).length > 0) stats.withResults += 1;
    }
    return stats;
  }

  private toResponse(exam: Exam): ExamResponseDto {
    const isCourse = exam.examKind === ExamKind.COURSE;
    const subjectName: LocalizedText | null = isCourse
      ? (exam.course?.subject?.name ?? null)
      : (exam.subject?.name ?? null);
    const teacher = isCourse ? exam.course?.teacher : exam.teacher;
    return {
      id: exam.id,
      title: exam.title,
      examKind: exam.examKind,
      examType: exam.examType,
      classId: exam.classId ?? null,
      className: exam.class?.name ?? null,
      subjectId: isCourse ? (exam.course?.subjectId ?? null) : (exam.subjectId ?? null),
      subjectName,
      teacherId: isCourse ? (exam.course?.teacherId ?? null) : (exam.teacherId ?? null),
      teacherName: teacher ? this.fullName(teacher) : null,
      courseId: exam.courseId ?? null,
      courseName: exam.course?.name ?? null,
      quarterId: exam.quarterId ?? null,
      quarterName: exam.quarter?.name ?? null,
      quarterNumber: exam.quarter?.quarterNumber ?? null,
      examDate: exam.examDate,
      availableFrom: exam.availableFrom ? exam.availableFrom.toISOString() : null,
      availableUntil: exam.availableUntil ? exam.availableUntil.toISOString() : null,
      maxScore: Number(exam.maxScore),
      status: exam.status,
      resultCount: (exam.results ?? []).length,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      version: exam.version,
    };
  }

  private normalizeWindow(from?: string, until?: string): { availableFrom: Date | null; availableUntil: Date | null } {
    const availableFrom = from ? new Date(from) : null;
    const availableUntil = until ? new Date(until) : null;
    if (availableFrom && availableUntil && availableFrom.getTime() >= availableUntil.getTime()) {
      throw new BadRequestException(
        this.msg(
          '"Dan mavjud" sanasi "Gacha mavjud" dan oldin bo‘lishi kerak',
          'Дата начала должна быть раньше даты окончания',
          'Start of availability window must be before its end',
        ),
      );
    }
    return { availableFrom, availableUntil };
  }

  private classTitle(subjectName: LocalizedText, type: ExamType, className: string): string {
    const subject = subjectName?.uz ?? subjectName?.ru ?? subjectName?.en ?? 'Imtihon';
    return `${subject} — ${EXAM_TYPE_LABEL[type]} (${className})`;
  }

  private fullName(user: { firstName?: string | null; lastName?: string | null }): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  }

  private async assertExists<T extends { id: string }>(repo: Repository<T>, id: string, message: string): Promise<void> {
    const found = await repo.findOne({ where: { id } as FindOptionsWhere<T> });
    if (!found) throw new NotFoundException(this.msg(message, message, message));
  }

  private msg(uz: string, ru: string, en: string) {
    return { message: { uz, ru, en } };
  }

  private async audit(actor: ExamActor | undefined, action: string, entityId: string, details?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditService?.log({
        userId: actor?.userId,
        action,
        entity: 'lms_exam',
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(`Failed to write exam audit log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
