import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditService } from "../audit/audit.service";
import { ILike, In, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not, Repository } from "typeorm";
import type { FindOptionsWhere } from "typeorm";
import { AttendanceStatus } from "../../common/enums/attendance-status.enum";
import { CommonStatus } from "../../common/enums/common-status.enum";
import type { LocalizedText } from "../../common/i18n/locale";
import { AttendanceRecord } from "../attendance/entities/attendance-record.entity";
import { CommunicationService } from "../communication/communication.service";
import type { ClassCampaignRecipient } from "../communication/communication.service";
import { CampaignStatus } from "../communication/enums/communication.enums";
import { User } from "../identity/entities/user.entity";
import { JournalEntry } from "../lms/entities/journal-entry.entity";
import { LessonSchedule } from "../lms/entities/lesson-schedule.entity";
import { Room } from "../settings/entities/room.entity";
import { Student } from "../students/entities/student.entity";
import { Gender } from "../students/enums/student-status.enum";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { ClassQueryDto } from "./dto/class-query.dto";
import {
  ClassDetailResponseDto,
  ClassListResultDto,
  ClassListStatsDto,
  ClassResponseDto,
  ClassStudentRowDto,
  SendClassSmsResponseDto,
  TransferClassStudentsResponseDto,
} from "./dto/class-response.dto";
import { ClassLanguage } from "./dto/create-class.dto";
import { SendClassSmsDto } from "./dto/send-class-sms.dto";
import { AddCourseStudentsDto } from "./dto/add-course-students.dto";
import { AvailableCourseStudentsQueryDto, CourseQueryDto } from "./dto/course-query.dto";
import {
  CourseDetailResponseDto,
  CourseListResponseDto,
  CourseListStatsDto,
  CourseResponseDto,
  CourseStudentRowDto,
} from "./dto/course-response.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateLessonPeriodDto } from "./dto/create-lesson-period.dto";
import { CreateQuarterDto } from "./dto/create-quarter.dto";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { SubjectQueryDto } from "./dto/subject-query.dto";
import {
  SubjectListResultDto,
  SubjectOverviewResponseDto,
  SubjectResponseDto,
  SubjectScheduleLessonDto,
} from "./dto/subject-response.dto";
import { SubjectScheduleQueryDto } from "./dto/subject-schedule.dto";
import {
  LessonPeriodListResponseDto,
  LessonPeriodResponseDto,
} from "./dto/lesson-period-response.dto";
import { QuarterQueryDto } from "./dto/quarter-query.dto";
import {
  QuarterListResponseDto,
  QuarterResponseDto,
  QuarterStatsDto,
} from "./dto/quarter-response.dto";
import { TransferClassStudentsDto } from "./dto/transfer-class-students.dto";
import { UpdateAcademicYearDto } from "./dto/update-academic-year.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { UpdateLessonPeriodDto } from "./dto/update-lesson-period.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { UpdateQuarterDto } from "./dto/update-quarter.dto";
import { AcademicYear } from "./entities/academic-year.entity";
import { Course } from "./entities/course.entity";
import { LessonPeriod } from "./entities/lesson-period.entity";
import { Quarter } from "./entities/quarter.entity";
import { SchoolClass } from "./entities/school-class.entity";
import { Subject } from "./entities/subject.entity";
import { QuarterStatus } from "./enums/quarter-status.enum";

interface QuarterValidationInput {
  academicYearId: string;
  quarterNumber: number;
  startDate: string;
  endDate: string;
}

interface LessonPeriodValidationInput {
  lessonNumber: number;
  code: string;
  startTime: string;
  endTime: string;
  order: number;
}

interface SubjectSaveInput {
  name: LocalizedText;
  normalizedName: string;
  code: string;
  color: string;
  status: CommonStatus;
  description?: LocalizedText | null;
}

interface CourseSaveInput {
  name: string;
  normalizedName: string;
  quarterId: string;
  quarter: Quarter;
  startDate: string;
  endDate: string;
  roomId: string;
  room: Room;
  description?: string | null;
  subjectId: string;
  subject: Subject;
  teacherId: string;
  teacher: User;
  plannedLessonCount: number;
  completedLessonCount: number;
  status: CommonStatus;
  students?: Student[];
}

interface ClassSaveInput {
  name: string;
  gradeLevel: number;
  section: string;
  language: string;
  academicYearId: string;
  roomId: string;
  curatorId: string;
  capacity: number;
  classType?: string;
  shift?: string;
  academicYear: AcademicYear;
  room: Room;
  curator: User;
}

/** Per-student computed metrics — attendance percentage and average mastery. */
interface ClassMetric {
  attendance: number;
  mastery: number;
}

/** Who performed the action — used for the academic-year audit trail. */
export interface AcademicActor {
  userId?: string;
  ipAddress?: string;
}

export interface AcademicYearStats {
  totalCount: number;
  currentYearName: string | null;
  currentCalendarYear: number;
}

export interface AcademicYearListResult {
  items: AcademicYear[];
  stats: AcademicYearStats;
}

@Injectable()
export class AcademicService {
  private readonly logger = new Logger(AcademicService.name);

  constructor(
    @InjectRepository(AcademicYear)
    private readonly academicYears: Repository<AcademicYear>,
    @InjectRepository(Quarter)
    private readonly quarters: Repository<Quarter>,
    @InjectRepository(LessonPeriod)
    private readonly lessonPeriods: Repository<LessonPeriod>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(SchoolClass)
    private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Room)
    private readonly rooms?: Repository<Room>,
    @InjectRepository(User)
    private readonly users?: Repository<User>,
    @InjectRepository(Student)
    private readonly students?: Repository<Student>,
    @InjectRepository(Course)
    private readonly courses?: Repository<Course>,
    @Optional()
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecords?: Repository<AttendanceRecord>,
    @Optional()
    @InjectRepository(JournalEntry)
    private readonly journalEntries?: Repository<JournalEntry>,
    @Optional()
    private readonly communicationService?: CommunicationService,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    @InjectRepository(LessonSchedule)
    private readonly lessonSchedules?: Repository<LessonSchedule>,
  ) {}

  async createAcademicYear(dto: CreateAcademicYearDto, actor?: AcademicActor): Promise<AcademicYear> {
    this.validateYearDates(dto.startDate, dto.endDate);
    await this.ensureNameAvailable(dto.name);
    await this.ensureNoOverlap(dto.startDate, dto.endDate);

    // First year ever is implicitly the current one, even if the client omits the flag.
    const existingCount = await this.academicYears.count();
    const makeCurrent = dto.isCurrent === true || existingCount === 0;

    const saved = await this.academicYears.save(
      this.academicYears.create({
        name: dto.name.trim(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        isCurrent: makeCurrent,
      }),
    );

    if (makeCurrent) {
      await this.unsetOtherCurrent(saved.id);
    }
    await this.audit(actor, "academic_year.created", saved.id, { name: saved.name });
    return saved;
  }

  findAcademicYears(): Promise<AcademicYear[]> {
    return this.academicYears.find({ order: { startDate: "DESC" } });
  }

  async listAcademicYears(): Promise<AcademicYearListResult> {
    const items = await this.academicYears.find({ order: { startDate: "DESC" } });
    const current = items.find((year) => year.isCurrent) ?? null;
    return {
      items,
      stats: {
        totalCount: items.length,
        currentYearName: current?.name ?? null,
        currentCalendarYear: new Date().getFullYear(),
      },
    };
  }

  async findAcademicYear(id: string): Promise<AcademicYear> {
    const academicYear = await this.academicYears.findOne({ where: { id } });
    if (!academicYear) {
      throw new NotFoundException("Academic year not found");
    }

    return academicYear;
  }

  async updateAcademicYear(id: string, dto: UpdateAcademicYearDto, actor?: AcademicActor): Promise<AcademicYear> {
    const academicYear = await this.findAcademicYear(id);
    const startDate = dto.startDate ?? academicYear.startDate;
    const endDate = dto.endDate ?? academicYear.endDate;

    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      this.validateYearDates(startDate, endDate);
      await this.ensureNoOverlap(startDate, endDate, id);
    }
    if (dto.name !== undefined && dto.name.trim() !== academicYear.name) {
      await this.ensureNameAvailable(dto.name, id);
    }

    if (dto.name !== undefined) academicYear.name = dto.name.trim();
    if (dto.startDate !== undefined) academicYear.startDate = dto.startDate;
    if (dto.endDate !== undefined) academicYear.endDate = dto.endDate;
    if (dto.isCurrent !== undefined) academicYear.isCurrent = dto.isCurrent;

    const saved = await this.academicYears.save(academicYear);
    if (dto.isCurrent === true) {
      await this.unsetOtherCurrent(saved.id);
    }
    await this.audit(actor, "academic_year.updated", saved.id, { changed: Object.keys(dto) });
    return saved;
  }

  /** Marks one year as current and clears the flag on every other year. */
  async setCurrentAcademicYear(id: string, actor?: AcademicActor): Promise<AcademicYear> {
    const academicYear = await this.findAcademicYear(id);
    academicYear.isCurrent = true;
    const saved = await this.academicYears.save(academicYear);
    await this.unsetOtherCurrent(saved.id);
    await this.audit(actor, "academic_year.set_current", saved.id, { name: saved.name });
    return saved;
  }

  async deleteAcademicYear(id: string, actor?: AcademicActor): Promise<void> {
    const academicYear = await this.findAcademicYear(id);

    if (academicYear.isCurrent) {
      throw new ConflictException("Joriy o‘quv yilini o‘chirib bo‘lmaydi");
    }

    const quarterCount = await this.quarters.count({ where: { academicYearId: id } });
    if (quarterCount > 0) {
      throw new ConflictException("Choraklari mavjud o‘quv yilini o‘chirib bo‘lmaydi");
    }

    await this.academicYears.softDelete(id);
    await this.audit(actor, "academic_year.archived", id, { name: academicYear.name });
  }

  // ---- Academic-year helpers ----

  private validateYearDates(startDate: string, endDate: string): void {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      throw new BadRequestException("Sana formati noto‘g‘ri");
    }
    if (start >= end) {
      throw new BadRequestException("Boshlanish sanasi tugash sanasidan oldin bo‘lishi kerak");
    }
  }

  private async ensureNameAvailable(name: string, excludeId?: string): Promise<void> {
    const existing = await this.academicYears.findOne({
      where: { name: name.trim(), ...(excludeId ? { id: Not(excludeId) } : {}) },
    });
    if (existing) {
      throw new ConflictException("Bunday nomli o‘quv yili allaqachon mavjud");
    }
  }

  /** Rejects a date range that intersects any other (non-deleted) academic year. */
  private async ensureNoOverlap(startDate: string, endDate: string, excludeId?: string): Promise<void> {
    const overlap = await this.academicYears.findOne({
      where: {
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
    if (overlap) {
      throw new ConflictException("O‘quv yili sanasi mavjud yil bilan ustma-ust tushadi");
    }
  }

  private async unsetOtherCurrent(currentId: string): Promise<void> {
    await this.academicYears.update({ id: Not(currentId), isCurrent: true }, { isCurrent: false });
  }

  private async audit(
    actor: AcademicActor | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    entity = "academic_year",
  ): Promise<void> {
    try {
      await this.auditService?.log({
        userId: actor?.userId,
        action,
        entity,
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write ${entity} audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async createQuarter(dto: CreateQuarterDto, actor?: AcademicActor): Promise<QuarterResponseDto> {
    const academicYear = await this.findAcademicYear(dto.academicYearId);
    const input: QuarterValidationInput = {
      academicYearId: dto.academicYearId,
      quarterNumber: dto.quarterNumber,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };

    this.validateQuarterDates(input, academicYear);
    await this.ensureQuarterCanBeSaved(input);

    const quarter = this.quarters.create({
      ...input,
      name: this.buildQuarterName(dto.quarterNumber),
      status: this.computeQuarterStatus(input.startDate, input.endDate),
    });

    const saved = await this.quarters.save(quarter);
    saved.academicYear = academicYear;
    await this.audit(actor, "quarter.created", saved.id, { quarterNumber: saved.quarterNumber }, "quarter");
    return this.toQuarterResponse(saved);
  }

  /** Lists quarters of an academic year (ordered) together with status counts. */
  async listQuarters(query: QuarterQueryDto = {}): Promise<QuarterListResponseDto> {
    const quarters = await this.quarters.find({
      where: query.academicYearId ? { academicYearId: query.academicYearId } : {},
      relations: { academicYear: true },
      order: { quarterNumber: "ASC" },
    });

    const items = quarters.map((quarter) => this.toQuarterResponse(quarter));
    return { items, stats: this.buildQuarterStats(items) };
  }

  async findQuarter(id: string): Promise<QuarterResponseDto> {
    return this.toQuarterResponse(await this.findQuarterEntity(id));
  }

  private async findQuarterEntity(id: string): Promise<Quarter> {
    const quarter = await this.quarters.findOne({
      where: { id },
      relations: { academicYear: true },
    });
    if (!quarter) {
      throw new NotFoundException("Quarter not found");
    }

    return quarter;
  }

  async updateQuarter(id: string, dto: UpdateQuarterDto, actor?: AcademicActor): Promise<QuarterResponseDto> {
    const quarter = await this.findQuarterEntity(id);
    const academicYearId = dto.academicYearId ?? quarter.academicYearId;
    const academicYear =
      academicYearId === quarter.academicYearId && quarter.academicYear
        ? quarter.academicYear
        : await this.findAcademicYear(academicYearId);
    const input: QuarterValidationInput = {
      academicYearId,
      quarterNumber: dto.quarterNumber ?? quarter.quarterNumber,
      startDate: dto.startDate ?? quarter.startDate,
      endDate: dto.endDate ?? quarter.endDate,
    };

    this.validateQuarterDates(input, academicYear);
    await this.ensureQuarterCanBeSaved(input, id);

    Object.assign(quarter, input, {
      academicYear,
      name: this.buildQuarterName(input.quarterNumber),
      status: this.computeQuarterStatus(input.startDate, input.endDate),
    });

    const saved = await this.quarters.save(quarter);
    await this.audit(actor, "quarter.updated", saved.id, { changed: Object.keys(dto) }, "quarter");
    return this.toQuarterResponse(saved);
  }

  async deleteQuarter(id: string, actor?: AcademicActor): Promise<void> {
    const quarter = await this.findQuarterEntity(id);

    const courseCount = (await this.courses?.count({ where: { quarterId: id } })) ?? 0;
    if (courseCount > 0) {
      throw new ConflictException("Kurslari mavjud chorakni o‘chirib bo‘lmaydi");
    }

    await this.quarters.softDelete(id);
    await this.audit(actor, "quarter.archived", id, { quarterNumber: quarter.quarterNumber }, "quarter");
  }

  async createLessonPeriod(
    dto: CreateLessonPeriodDto,
    actor?: AcademicActor,
  ): Promise<LessonPeriodResponseDto> {
    const input = this.buildLessonPeriodInput(dto);
    this.validateLessonPeriodTimes(input);
    await this.ensureLessonPeriodCanBeSaved(input);

    const lessonPeriod = await this.lessonPeriods.save(
      this.lessonPeriods.create({
        code: input.code,
        startTime: input.startTime,
        endTime: input.endTime,
        order: input.order,
      }),
    );

    await this.audit(actor, "lesson_period.created", lessonPeriod.id, { code: lessonPeriod.code }, "lesson_period");
    return this.toLessonPeriodResponse(lessonPeriod);
  }

  /** Lists lesson periods (ordered) with summary stats for the management table. */
  async listLessonPeriods(): Promise<LessonPeriodListResponseDto> {
    const lessonPeriods = await this.lessonPeriods.find({ order: { order: "ASC" } });
    const items = lessonPeriods.map((lessonPeriod) => this.toLessonPeriodResponse(lessonPeriod));
    return {
      items,
      stats: {
        total: items.length,
        firstStartTime: items[0]?.startTime ?? null,
      },
    };
  }

  async findLessonPeriod(id: string): Promise<LessonPeriodResponseDto> {
    const lessonPeriod = await this.findLessonPeriodEntity(id);
    return this.toLessonPeriodResponse(lessonPeriod);
  }

  async updateLessonPeriod(
    id: string,
    dto: UpdateLessonPeriodDto,
    actor?: AcademicActor,
  ): Promise<LessonPeriodResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one lesson period field must be provided");
    }

    const lessonPeriod = await this.findLessonPeriodEntity(id);
    const input = this.buildLessonPeriodInput({
      lessonNumber: dto.lessonNumber ?? lessonPeriod.order,
      startTime: dto.startTime ?? this.formatLessonTime(lessonPeriod.startTime),
      endTime: dto.endTime ?? this.formatLessonTime(lessonPeriod.endTime),
    });

    this.validateLessonPeriodTimes(input);
    await this.ensureLessonPeriodCanBeSaved(input, id);

    Object.assign(lessonPeriod, {
      code: input.code,
      startTime: input.startTime,
      endTime: input.endTime,
      order: input.order,
    });

    const saved = await this.lessonPeriods.save(lessonPeriod);
    await this.audit(actor, "lesson_period.updated", saved.id, { changed: Object.keys(dto) }, "lesson_period");
    return this.toLessonPeriodResponse(saved);
  }

  async deleteLessonPeriod(id: string, actor?: AcademicActor): Promise<void> {
    const lessonPeriod = await this.findLessonPeriodEntity(id);
    await this.lessonPeriods.softDelete(id);
    await this.audit(actor, "lesson_period.archived", id, { code: lessonPeriod.code }, "lesson_period");
  }

  async createSubject(dto: CreateSubjectDto, actor?: AcademicActor): Promise<SubjectResponseDto> {
    const status = this.resolveSubjectStatus(dto, CommonStatus.ACTIVE);
    const input = this.buildSubjectInput(dto, status);
    await this.ensureSubjectCanBeSaved(input);

    const subject = await this.subjects.save(this.subjects.create(input));
    await this.audit(actor, "subject.created", subject.id, { code: subject.code }, "subject");

    return this.toSubjectResponse(subject);
  }

  async findSubjects(query: SubjectQueryDto = {}): Promise<SubjectListResultDto> {
    const subjects = await this.subjects.find({
      where: this.buildSubjectWhere(query),
      order: { normalizedName: "ASC" },
    });

    const items = subjects.map((subject) => this.toSubjectResponse(subject));
    return { items, stats: this.buildSubjectListStats(items) };
  }

  async findSubject(id: string): Promise<SubjectResponseDto> {
    return this.toSubjectResponse(await this.findSubjectEntity(id));
  }

  async findSubjectOverview(id: string): Promise<SubjectOverviewResponseDto> {
    const subject = await this.findSubjectEntity(id);
    const lessonsRepo = this.lessonSchedules;

    const classes = new Map<string, string>();
    const teachers = new Map<string, string>();
    let lessonCount = 0;

    if (lessonsRepo) {
      const lessons = await lessonsRepo.find({
        where: { subjectId: id },
        relations: { class: true, teacher: true },
      });
      lessonCount = lessons.length;
      for (const lesson of lessons) {
        if (lesson.class) {
          classes.set(lesson.class.id, lesson.class.name);
        }
        if (lesson.teacher) {
          teachers.set(lesson.teacher.id, this.buildUserFullName(lesson.teacher));
        }
      }
    }

    return {
      subject: this.toSubjectResponse(subject),
      stats: {
        classCount: classes.size,
        teacherCount: teachers.size,
        lessonCount,
        averageMastery: await this.computeSubjectAverageMastery(id),
      },
      classes: Array.from(classes, ([classId, name]) => ({ id: classId, name })).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      teachers: Array.from(teachers, ([teacherId, fullName]) => ({ id: teacherId, fullName })).sort(
        (a, b) => a.fullName.localeCompare(b.fullName),
      ),
    };
  }

  async findSubjectSchedule(
    id: string,
    query: SubjectScheduleQueryDto = {},
  ): Promise<SubjectScheduleLessonDto[]> {
    await this.findSubjectEntity(id);
    const lessonsRepo = this.lessonSchedules;
    if (!lessonsRepo) {
      return [];
    }

    const lessons = await lessonsRepo.find({
      where: {
        subjectId: id,
        ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      },
      relations: { class: true, teacher: true, lessonPeriod: true },
      order: { lessonDate: "ASC" },
    });

    return lessons.map((lesson) => this.toSubjectScheduleLesson(lesson));
  }

  async updateSubject(id: string, dto: UpdateSubjectDto, actor?: AcademicActor): Promise<SubjectResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one subject field must be provided");
    }

    const subject = await this.findSubjectEntity(id);
    const status = this.resolveSubjectStatus(dto, subject.status ?? CommonStatus.ACTIVE);
    const input = this.buildSubjectInput(
      {
        name: dto.name ?? subject.name?.uz ?? subject.code,
        russianName: dto.russianName ?? subject.name?.ru ?? subject.name?.uz ?? subject.code,
        englishName: dto.englishName ?? subject.name?.en ?? subject.name?.uz ?? subject.code,
        code: dto.code ?? subject.code,
        color: dto.color ?? subject.color ?? "#2563EB",
        description: dto.description ?? this.localizedTextToPlain(subject.description),
      },
      status,
    );

    await this.ensureSubjectCanBeSaved(input, id);
    Object.assign(subject, input);

    const saved = await this.subjects.save(subject);
    await this.audit(actor, "subject.updated", id, { changed: Object.keys(dto) }, "subject");

    return this.toSubjectResponse(saved);
  }

  async deleteSubject(id: string, actor?: AcademicActor): Promise<void> {
    const subject = await this.findSubjectEntity(id);

    if (await this.isSubjectInUse(id)) {
      throw new ConflictException("Subject is in use and cannot be deleted");
    }

    await this.subjects.softDelete(id);
    await this.audit(actor, "subject.deleted", id, { code: subject.code }, "subject");
  }

  async createCourse(dto: CreateCourseDto, actor?: AcademicActor): Promise<CourseResponseDto> {
    const input = await this.buildCourseInput(dto);
    await this.ensureCourseCanBeSaved(input);

    const course = await this.getCoursesRepository().save(this.getCoursesRepository().create(input));
    await this.audit(actor, "course.created", course.id, { name: course.name }, "course");

    return this.toCourseResponse(course);
  }

  async findCourses(query: CourseQueryDto = {}): Promise<CourseListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const where = this.buildCourseWhere(query);
    const [courses, total] = await this.getCoursesRepository().findAndCount({
      where,
      relations: this.courseRelations(),
      skip: (page - 1) * limit,
      take: limit,
      order: { startDate: "DESC", normalizedName: "ASC" },
    });

    return {
      items: courses.map((course) => this.toCourseResponse(course)),
      stats: await this.buildCourseListStats(where),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findCourse(id: string): Promise<CourseDetailResponseDto> {
    return this.toCourseDetailResponse(await this.findCourseEntity(id));
  }

  async updateCourse(id: string, dto: UpdateCourseDto, actor?: AcademicActor): Promise<CourseResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        message: {
          uz: "Kamida bitta kurs maydoni berilishi kerak",
          ru: "Необходимо указать хотя бы одно поле курса",
          en: "At least one course field must be provided",
        },
      });
    }

    const course = await this.findCourseEntity(id);
    const input = await this.buildCourseInput(
      {
        name: dto.name ?? course.name,
        quarterId: dto.quarterId ?? course.quarterId,
        startDate: dto.startDate ?? course.startDate,
        endDate: dto.endDate ?? course.endDate,
        roomId: dto.roomId ?? course.roomId,
        description: dto.description ?? course.description ?? undefined,
        subjectId: dto.subjectId ?? course.subjectId,
        teacherId: dto.teacherId ?? course.teacherId,
        plannedLessonCount: dto.plannedLessonCount ?? course.plannedLessonCount,
        studentIds: dto.studentIds,
      },
      dto.status ?? course.status ?? CommonStatus.ACTIVE,
      course.completedLessonCount,
    );

    await this.ensureCourseCanBeSaved(input, id);
    Object.assign(course, input);

    const saved = await this.getCoursesRepository().save(course);
    await this.audit(actor, "course.updated", id, { changed: Object.keys(dto) }, "course");

    return this.toCourseResponse(saved);
  }

  async deleteCourse(id: string, actor?: AcademicActor): Promise<void> {
    const course = await this.findCourseEntity(id);

    if ((course.students ?? []).length > 0) {
      throw new ConflictException("Course has students and cannot be deleted");
    }

    await this.getCoursesRepository().softDelete(id);
    await this.audit(actor, "course.deleted", id, { name: course.name }, "course");
  }

  async addCourseStudents(
    id: string,
    dto: AddCourseStudentsDto,
    actor?: AcademicActor,
  ): Promise<CourseDetailResponseDto> {
    const course = await this.findCourseEntity(id);
    const newStudents = await this.findStudentsByIds(dto.studentIds);
    const existingStudents = course.students ?? [];
    const byId = new Map(existingStudents.map((student) => [student.id, student]));

    for (const student of newStudents) {
      byId.set(student.id, student);
    }

    course.students = Array.from(byId.values());

    const saved = await this.getCoursesRepository().save(course);
    await this.audit(actor, "course.students_added", id, { addedCount: newStudents.length }, "course");

    return this.toCourseDetailResponse(saved);
  }

  async removeCourseStudent(
    id: string,
    studentId: string,
    actor?: AcademicActor,
  ): Promise<CourseDetailResponseDto> {
    const course = await this.findCourseEntity(id);
    course.students = (course.students ?? []).filter((student) => student.id !== studentId);

    const saved = await this.getCoursesRepository().save(course);
    await this.audit(actor, "course.student_removed", id, { studentId }, "course");

    return this.toCourseDetailResponse(saved);
  }

  async findAvailableCourseStudents(
    id: string,
    query: AvailableCourseStudentsQueryDto = {},
  ): Promise<CourseStudentRowDto[]> {
    const course = await this.findCourseEntity(id);
    const selectedIds = new Set((course.students ?? []).map((student) => student.id));
    const students = await this.getStudentsRepository().find({
      where: this.buildAvailableStudentWhere(query),
      relations: { currentClass: true },
      order: { lastName: "ASC", firstName: "ASC" },
    });

    return students.filter((student) => !selectedIds.has(student.id)).map((student) => this.toCourseStudentRow(student));
  }

  async createClass(dto: CreateClassDto, actor?: AcademicActor): Promise<ClassResponseDto> {
    const input = await this.buildClassInput(dto);
    await this.ensureClassCanBeSaved(input);

    const schoolClass = await this.classes.save(
      this.classes.create({
        name: input.name,
        gradeLevel: input.gradeLevel,
        section: input.section,
        language: input.language,
        academicYearId: input.academicYearId,
        academicYear: input.academicYear,
        roomId: input.roomId,
        room: input.room,
        curatorId: input.curatorId,
        curator: input.curator,
        capacity: input.capacity,
        classType: input.classType,
        shift: input.shift,
      }),
    );

    await this.audit(actor, "class.created", schoolClass.id, { name: schoolClass.name }, "class");

    return this.toClassResponse(schoolClass, [], new Map());
  }

  async findClasses(query: ClassQueryDto = {}): Promise<ClassListResultDto> {
    const schoolClasses = await this.classes.find({
      where: this.buildClassWhere(query),
      relations: { academicYear: true, room: true, curator: true },
      order: { gradeLevel: "ASC", section: "ASC" },
    });

    const studentsByClass = await this.findStudentsForClasses(schoolClasses.map((schoolClass) => schoolClass.id));
    const allStudents = Array.from(studentsByClass.values()).flat();
    const metrics = await this.computeClassMetrics(allStudents.map((student) => student.id));

    const items = schoolClasses.map((schoolClass) =>
      this.toClassResponse(schoolClass, studentsByClass.get(schoolClass.id) ?? [], metrics),
    );

    return { items, stats: this.buildClassListStats(items) };
  }

  async findClass(id: string): Promise<ClassDetailResponseDto> {
    const schoolClass = await this.findClassEntity(id);
    const students = await this.findStudentsByClassId(id);
    const metrics = await this.computeClassMetrics(students.map((student) => student.id));

    return {
      ...this.toClassResponse(schoolClass, students, metrics),
      students: students.map((student) => this.toClassStudentRow(student, metrics)),
    };
  }

  async updateClass(id: string, dto: UpdateClassDto, actor?: AcademicActor): Promise<ClassResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one class field must be provided");
    }

    const schoolClass = await this.findClassEntity(id);
    const input = await this.buildClassInput({
      gradeLevel: dto.gradeLevel ?? schoolClass.gradeLevel,
      section: dto.section ?? schoolClass.section,
      language: dto.language ?? (schoolClass.language as CreateClassDto["language"]),
      academicYearId: dto.academicYearId ?? schoolClass.academicYearId,
      roomId: dto.roomId ?? schoolClass.roomId ?? "",
      curatorId: dto.curatorId ?? schoolClass.curatorId ?? "",
      capacity: dto.capacity ?? schoolClass.capacity,
      classType: dto.classType ?? schoolClass.classType ?? undefined,
      shift: dto.shift ?? schoolClass.shift ?? undefined,
    });

    await this.ensureClassCanBeSaved(input, id);
    Object.assign(schoolClass, input);

    const saved = await this.classes.save(schoolClass);
    await this.audit(actor, "class.updated", id, { changed: Object.keys(dto) }, "class");

    const students = await this.findStudentsByClassId(id);
    return this.toClassResponse(saved, students, await this.computeClassMetrics(students.map((s) => s.id)));
  }

  async deleteClass(id: string, actor?: AcademicActor): Promise<void> {
    const schoolClass = await this.findClassEntity(id);

    const students = await this.findStudentsByClassId(id);
    if (students.length > 0) {
      throw new ConflictException("Class has students and cannot be deleted");
    }

    await this.classes.softDelete(id);
    await this.audit(actor, "class.deleted", id, { name: schoolClass.name }, "class");
  }

  async transferClassStudents(
    sourceClassId: string,
    dto: TransferClassStudentsDto,
    actor?: AcademicActor,
  ): Promise<TransferClassStudentsResponseDto> {
    if (sourceClassId === dto.targetClassId) {
      throw new BadRequestException("Target class must be different from source class");
    }

    const sourceClass = await this.findClassByAcademicYear(sourceClassId, dto.academicYearId);
    const targetClass = await this.findClassByAcademicYear(dto.targetClassId, dto.academicYearId);
    const students = await this.findStudentsByClassId(sourceClass.id, dto.studentIds);
    const studentIds = students.map((student) => student.id);

    if (studentIds.length > 0) {
      const targetStudentCount = (await this.findStudentsByClassId(targetClass.id)).length;
      if (targetClass.capacity && targetStudentCount + studentIds.length > targetClass.capacity) {
        throw new ConflictException("Target class capacity is exceeded by the transfer");
      }

      // A single bulk UPDATE is atomic at the database level, so no explicit
      // transaction wrapper is needed here.
      await this.getStudentsRepository().update(studentIds, { currentClassId: targetClass.id });
    }

    await this.audit(actor, "class.students_transferred", sourceClass.id, {
      targetClassId: targetClass.id,
      movedStudentCount: studentIds.length,
    }, "class");

    return {
      sourceClassId: sourceClass.id,
      targetClassId: targetClass.id,
      movedStudentCount: studentIds.length,
    };
  }

  async sendClassSms(
    classId: string,
    dto: SendClassSmsDto,
    actor?: AcademicActor,
  ): Promise<SendClassSmsResponseDto> {
    if (!this.communicationService) {
      throw new Error("Communication service is not configured");
    }

    const schoolClass = await this.findClassEntity(classId);
    const body = await this.resolveSmsBody(dto);

    const students = await this.getStudentsRepository().find({
      where: {
        currentClassId: classId,
        ...(dto.studentIds ? { id: In(dto.studentIds) } : {}),
      },
      relations: { parents: { parent: true } },
      order: { lastName: "ASC", firstName: "ASC" },
    });

    if (students.length === 0) {
      throw new BadRequestException("Class has no students to message");
    }

    const recipients: ClassCampaignRecipient[] = [];
    let skippedCount = 0;
    for (const student of students) {
      const phone = this.resolveStudentPhone(student);
      if (phone) {
        recipients.push({ studentId: student.id, phone });
      } else {
        skippedCount += 1;
      }
    }

    if (recipients.length === 0) {
      throw new BadRequestException("No recipients with a phone number were found");
    }

    const scheduledAt = this.resolveScheduledAt(dto.scheduledAt);
    const result = await this.communicationService.createClassCampaign({
      name: `SMS: ${schoolClass.name}`,
      body,
      templateId: dto.templateId ?? null,
      scheduledAt,
      targetFilter: { classId },
      recipients,
    });

    await this.audit(actor, "class.sms_sent", classId, {
      campaignId: result.campaignId,
      totalRecipients: result.totalRecipients,
      skippedCount,
      scheduled: result.status === CampaignStatus.SCHEDULED,
    }, "class");

    return {
      campaignId: result.campaignId,
      channel: "sms",
      totalRecipients: result.totalRecipients,
      skippedCount,
      status: result.status,
      scheduledAt: result.scheduledAt ? result.scheduledAt.toISOString() : null,
    };
  }

  private buildQuarterName(quarterNumber: number): LocalizedText {
    return {
      uz: quarterNumber + "-chorak",
      ru: quarterNumber + "-я четверть",
      en: "Quarter " + quarterNumber,
    };
  }

  private validateQuarterDates(
    input: Pick<QuarterValidationInput, "startDate" | "endDate">,
    academicYear: AcademicYear,
  ): void {
    const startDate = this.toDate(input.startDate);
    const endDate = this.toDate(input.endDate);
    const academicYearStartDate = this.toDate(academicYear.startDate);
    const academicYearEndDate = this.toDate(academicYear.endDate);

    if (endDate < startDate) {
      throw new BadRequestException("Quarter end date must be after or equal to start date");
    }

    if (startDate < academicYearStartDate || endDate > academicYearEndDate) {
      throw new BadRequestException("Quarter dates must be inside the academic year range");
    }
  }

  private async ensureQuarterCanBeSaved(
    input: QuarterValidationInput,
    excludeQuarterId?: string,
  ): Promise<void> {
    const excludedIdWhere = excludeQuarterId ? { id: Not(excludeQuarterId) } : {};
    const duplicateQuarter = await this.quarters.findOne({
      where: {
        academicYearId: input.academicYearId,
        quarterNumber: input.quarterNumber,
        ...excludedIdWhere,
      },
    });

    if (duplicateQuarter) {
      throw new ConflictException("Quarter number already exists for this academic year");
    }

    const overlapWhere: FindOptionsWhere<Quarter> = {
      academicYearId: input.academicYearId,
      startDate: LessThanOrEqual(input.endDate),
      endDate: MoreThanOrEqual(input.startDate),
      ...excludedIdWhere,
    };
    const overlappingQuarter = await this.quarters.findOne({ where: overlapWhere });

    if (overlappingQuarter) {
      throw new ConflictException("Quarter dates overlap with an existing quarter");
    }
  }

  /** Derives quarter status from today's date — never persisted as source of truth. */
  private computeQuarterStatus(startDate: string, endDate: string, today: Date = new Date()): QuarterStatus {
    const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const start = this.toDate(startDate);
    const end = this.toDate(endDate);
    if (now < start) return QuarterStatus.PLANNED;
    if (now > end) return QuarterStatus.COMPLETED;
    return QuarterStatus.CURRENT;
  }

  private toQuarterResponse(quarter: Quarter): QuarterResponseDto {
    return {
      id: quarter.id,
      academicYearId: quarter.academicYearId,
      quarterNumber: quarter.quarterNumber,
      name: quarter.name?.uz ?? `${quarter.quarterNumber}-chorak`,
      startDate: quarter.startDate,
      endDate: quarter.endDate,
      status: this.computeQuarterStatus(quarter.startDate, quarter.endDate),
      academicYear: quarter.academicYear
        ? { id: quarter.academicYear.id, name: quarter.academicYear.name }
        : null,
      createdAt: quarter.createdAt?.toISOString?.() ?? undefined,
      updatedAt: quarter.updatedAt?.toISOString?.() ?? undefined,
    };
  }

  private buildQuarterStats(items: QuarterResponseDto[]): QuarterStatsDto {
    return {
      total: items.length,
      planned: items.filter((item) => item.status === QuarterStatus.PLANNED).length,
      current: items.filter((item) => item.status === QuarterStatus.CURRENT).length,
      completed: items.filter((item) => item.status === QuarterStatus.COMPLETED).length,
    };
  }

  private buildLessonPeriodInput(dto: CreateLessonPeriodDto): LessonPeriodValidationInput {
    return {
      lessonNumber: dto.lessonNumber,
      code: dto.lessonNumber + "-Dars",
      startTime: this.normalizeLessonTime(dto.startTime),
      endTime: this.normalizeLessonTime(dto.endTime),
      order: dto.lessonNumber,
    };
  }

  private validateLessonPeriodTimes(input: Pick<LessonPeriodValidationInput, "startTime" | "endTime">): void {
    if (this.toMinutes(input.endTime) <= this.toMinutes(input.startTime)) {
      throw new BadRequestException("Lesson period end time must be after start time");
    }
  }

  private async ensureLessonPeriodCanBeSaved(
    input: LessonPeriodValidationInput,
    excludeLessonPeriodId?: string,
  ): Promise<void> {
    const excludedIdWhere = excludeLessonPeriodId ? { id: Not(excludeLessonPeriodId) } : {};
    const duplicateLessonPeriod = await this.lessonPeriods.findOne({
      where: [
        { order: input.order, ...excludedIdWhere },
        { code: input.code, ...excludedIdWhere },
      ],
    });

    if (duplicateLessonPeriod) {
      throw new ConflictException("Lesson number already exists");
    }

    const overlappingLessonPeriod = await this.lessonPeriods.findOne({
      where: {
        startTime: LessThan(input.endTime),
        endTime: MoreThan(input.startTime),
        ...excludedIdWhere,
      },
    });

    if (overlappingLessonPeriod) {
      throw new ConflictException("Lesson period overlaps with an existing lesson period");
    }
  }

  private async findLessonPeriodEntity(id: string): Promise<LessonPeriod> {
    const lessonPeriod = await this.lessonPeriods.findOne({ where: { id } });
    if (!lessonPeriod) {
      throw new NotFoundException("Lesson period not found");
    }

    return lessonPeriod;
  }

  private toLessonPeriodResponse(lessonPeriod: LessonPeriod): LessonPeriodResponseDto {
    return {
      id: lessonPeriod.id,
      code: lessonPeriod.code,
      lessonNumber: lessonPeriod.order,
      startTime: this.formatLessonTime(lessonPeriod.startTime),
      endTime: this.formatLessonTime(lessonPeriod.endTime),
      order: lessonPeriod.order,
      createdAt: lessonPeriod.createdAt?.toISOString(),
      updatedAt: lessonPeriod.updatedAt?.toISOString(),
      version: lessonPeriod.version,
    };
  }

  private buildSubjectInput(dto: CreateSubjectDto, status = CommonStatus.ACTIVE): SubjectSaveInput {
    const name = this.buildSubjectLocalizedName(dto);
    const code = this.buildSubjectCode(dto.name, dto.code);

    return {
      name,
      normalizedName: this.normalizeSubjectName(dto.name),
      code,
      color: dto.color.toUpperCase(),
      status,
      description: this.buildSubjectDescription(dto.description),
    };
  }

  private buildSubjectListStats(items: SubjectResponseDto[]): SubjectListResultDto["stats"] {
    const active = items.filter((item) => item.isActive).length;
    return {
      total: items.length,
      active,
      inactive: items.length - active,
    };
  }

  /** A subject is "in use" when any lesson or course references it. */
  private async isSubjectInUse(subjectId: string): Promise<boolean> {
    if (this.lessonSchedules && (await this.lessonSchedules.count({ where: { subjectId } })) > 0) {
      return true;
    }
    if (this.courses && (await this.courses.count({ where: { subjectId } })) > 0) {
      return true;
    }
    return false;
  }

  private async computeSubjectAverageMastery(subjectId: string): Promise<number> {
    if (!this.journalEntries) {
      return 0;
    }

    const row = await this.journalEntries
      .createQueryBuilder("j")
      .innerJoin("j.lesson", "l")
      .select("AVG(j.grade)", "avgGrade")
      .where("l.subject_id = :subjectId", { subjectId })
      .andWhere("j.grade IS NOT NULL")
      .getRawOne<{ avgGrade: string | null }>();

    return row?.avgGrade ? this.round1(Number(row.avgGrade)) : 0;
  }

  private toSubjectScheduleLesson(lesson: LessonSchedule): SubjectScheduleLessonDto {
    return {
      id: lesson.id,
      lessonDate: lesson.lessonDate,
      weekday: this.toWeekday(lesson.lessonDate),
      class: { id: lesson.class?.id ?? lesson.classId, name: lesson.class?.name ?? "" },
      teacherName: lesson.teacher ? this.buildUserFullName(lesson.teacher) : null,
      periodLabel: lesson.lessonPeriod?.code ?? null,
      startTime: lesson.lessonPeriod ? this.formatLessonTime(lesson.lessonPeriod.startTime) : null,
      endTime: lesson.lessonPeriod ? this.formatLessonTime(lesson.lessonPeriod.endTime) : null,
      status: lesson.status,
    };
  }

  /** ISO date → ISO weekday (1 = Dushanba … 7 = Yakshanba). */
  private toWeekday(isoDate: string): number {
    const day = new Date(isoDate + "T00:00:00.000Z").getUTCDay();
    return ((day + 6) % 7) + 1;
  }

  private buildSubjectWhere(query: SubjectQueryDto): FindOptionsWhere<Subject> | FindOptionsWhere<Subject>[] {
    const baseWhere: FindOptionsWhere<Subject> = {
      ...(query.status ? { status: query.status } : {}),
    };
    const searchText = query.search;
    const search = searchText ? this.normalizeSubjectName(searchText) : undefined;

    if (!search) {
      return baseWhere;
    }

    return [
      { ...baseWhere, normalizedName: ILike("%" + search + "%") },
      { ...baseWhere, code: ILike("%" + this.buildSubjectCode(searchText ?? search) + "%") },
    ];
  }

  private async ensureSubjectCanBeSaved(input: SubjectSaveInput, excludeSubjectId?: string): Promise<void> {
    const excludedIdWhere = excludeSubjectId ? { id: Not(excludeSubjectId) } : {};
    const duplicateSubject = await this.subjects.findOne({
      where: [
        { code: input.code, ...excludedIdWhere },
        { normalizedName: input.normalizedName, ...excludedIdWhere },
      ],
    });

    if (duplicateSubject) {
      throw new ConflictException("Subject already exists");
    }
  }

  private async findSubjectEntity(id: string): Promise<Subject> {
    const subject = await this.subjects.findOne({ where: { id } });

    if (!subject) {
      throw new NotFoundException("Subject not found");
    }

    return subject;
  }

  private resolveSubjectStatus(
    dto: { isActive?: boolean; status?: CommonStatus },
    fallback: CommonStatus,
  ): CommonStatus {
    const toggleStatus = dto.isActive === undefined ? undefined : dto.isActive ? CommonStatus.ACTIVE : CommonStatus.INACTIVE;

    if (dto.status && toggleStatus && dto.status !== toggleStatus) {
      throw new BadRequestException("Subject status and active flag conflict");
    }

    return toggleStatus ?? dto.status ?? fallback;
  }

  private toSubjectResponse(subject: Subject): SubjectResponseDto {
    const localizedName = this.ensureSubjectLocalizedName(subject.name, subject.code);
    const status = subject.status ?? CommonStatus.ACTIVE;

    return {
      id: subject.id,
      name: localizedName.uz,
      russianName: localizedName.ru,
      englishName: localizedName.en,
      localizedName,
      code: subject.code,
      color: subject.color ?? "#2563EB",
      status,
      isActive: status === CommonStatus.ACTIVE,
      createdAt: subject.createdAt?.toISOString(),
      updatedAt: subject.updatedAt?.toISOString(),
      version: subject.version,
    };
  }

  private buildSubjectLocalizedName(dto: Pick<CreateSubjectDto, "name" | "russianName" | "englishName">): LocalizedText {
    return {
      uz: dto.name,
      ru: dto.russianName,
      en: dto.englishName ?? dto.name,
    };
  }

  private buildSubjectDescription(description?: string): LocalizedText | null {
    if (!description) {
      return null;
    }

    return { uz: description, ru: description, en: description };
  }

  private ensureSubjectLocalizedName(name: LocalizedText | undefined, fallback: string): LocalizedText {
    const uz = name?.uz || fallback;
    const ru = name?.ru || uz;
    const en = name?.en || uz;

    return { uz, ru, en };
  }

  private localizedTextToPlain(value?: LocalizedText | null): string | undefined {
    return value?.uz ?? value?.ru ?? value?.en;
  }

  private normalizeSubjectName(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("uz-UZ").slice(0, 160);
  }

  private buildSubjectCode(name: string, requestedCode?: string): string {
    const source = requestedCode ?? name;
    const code = source
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[‘’`ʻʼ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .slice(0, 40);

    return code || "SUBJECT";
  }

  private async buildCourseInput(
    dto: CreateCourseDto,
    status = CommonStatus.ACTIVE,
    completedLessonCount = 0,
  ): Promise<CourseSaveInput> {
    const [quarter, room, subject, teacher] = await Promise.all([
      this.findQuarterEntity(dto.quarterId),
      this.findRoomEntity(dto.roomId),
      this.findSubjectEntity(dto.subjectId),
      this.findUserEntity(dto.teacherId),
    ]);
    const input: CourseSaveInput = {
      name: this.normalizeDisplayText(dto.name),
      normalizedName: this.normalizeSubjectName(dto.name),
      quarterId: dto.quarterId,
      quarter,
      startDate: dto.startDate,
      endDate: dto.endDate,
      roomId: dto.roomId,
      room,
      description: dto.description ? this.normalizeDisplayText(dto.description) : null,
      subjectId: dto.subjectId,
      subject,
      teacherId: dto.teacherId,
      teacher,
      plannedLessonCount: dto.plannedLessonCount ?? 0,
      completedLessonCount,
      status,
    };

    this.validateCourseDates(input, quarter);

    if (dto.studentIds !== undefined) {
      input.students = await this.findStudentsByIds(dto.studentIds);
    }

    return input;
  }

  private async buildCourseListStats(
    where: FindOptionsWhere<Course> | FindOptionsWhere<Course>[],
  ): Promise<CourseListStatsDto> {
    const courses = await this.getCoursesRepository().find({
      where,
      relations: { students: true },
    });

    const teacherIds = new Set<string>();
    const studentIds = new Set<string>();
    let plannedLessons = 0;
    let completedLessons = 0;

    for (const course of courses) {
      teacherIds.add(course.teacherId);
      plannedLessons += course.plannedLessonCount ?? 0;
      completedLessons += course.completedLessonCount ?? 0;
      for (const student of course.students ?? []) {
        studentIds.add(student.id);
      }
    }

    return {
      totalCourses: courses.length,
      totalStudents: studentIds.size,
      totalTeachers: teacherIds.size,
      plannedLessons,
      completedLessons,
    };
  }

  private buildCourseWhere(query: CourseQueryDto): FindOptionsWhere<Course> | FindOptionsWhere<Course>[] {
    const baseWhere: FindOptionsWhere<Course> = {
      ...(query.quarterId ? { quarterId: query.quarterId } : {}),
      ...(query.quarterNumber ? { quarter: { quarterNumber: query.quarterNumber } } : {}),
      ...(query.startDate ? { startDate: MoreThanOrEqual(query.startDate) } : {}),
      ...(query.endDate ? { endDate: LessThanOrEqual(query.endDate) } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const search = query.search ? this.normalizeSubjectName(query.search) : undefined;

    if (!search) {
      return baseWhere;
    }

    return [
      { ...baseWhere, normalizedName: ILike("%" + search + "%") },
      { ...baseWhere, description: ILike("%" + query.search + "%") },
    ];
  }

  private buildAvailableStudentWhere(
    query: AvailableCourseStudentsQueryDto,
  ): FindOptionsWhere<Student> | FindOptionsWhere<Student>[] {
    const baseWhere: FindOptionsWhere<Student> = {
      ...(query.classId ? { currentClassId: query.classId } : {}),
    };
    const search = query.search ? query.search.trim() : undefined;

    if (!search) {
      return baseWhere;
    }

    return [
      { ...baseWhere, firstName: ILike("%" + search + "%") },
      { ...baseWhere, lastName: ILike("%" + search + "%") },
      { ...baseWhere, studentCode: ILike("%" + search + "%") },
    ];
  }

  private async ensureCourseCanBeSaved(input: CourseSaveInput, excludeCourseId?: string): Promise<void> {
    const excludedIdWhere = excludeCourseId ? { id: Not(excludeCourseId) } : {};
    const duplicateCourse = await this.getCoursesRepository().findOne({
      where: {
        quarterId: input.quarterId,
        normalizedName: input.normalizedName,
        ...excludedIdWhere,
      },
    });

    if (duplicateCourse) {
      throw new ConflictException({
        message: {
          uz: "Bu chorakda shu nomli kurs allaqachon mavjud",
          ru: "Курс с таким названием уже существует в этой четверти",
          en: "A course with this name already exists in this quarter",
        },
      });
    }
  }

  private validateCourseDates(input: Pick<CourseSaveInput, "startDate" | "endDate">, quarter: Quarter): void {
    const startDate = this.toDate(input.startDate);
    const endDate = this.toDate(input.endDate);
    const quarterStartDate = this.toDate(quarter.startDate);
    const quarterEndDate = this.toDate(quarter.endDate);

    if (endDate < startDate) {
      throw new BadRequestException({
        message: {
          uz: "Kurs tugash sanasi boshlanish sanasidan keyin yoki unga teng bo'lishi kerak",
          ru: "Дата окончания курса должна быть не раньше даты начала",
          en: "Course end date must be after or equal to the start date",
        },
      });
    }

    if (startDate < quarterStartDate || endDate > quarterEndDate) {
      const range = `${quarter.startDate} – ${quarter.endDate}`;
      throw new BadRequestException({
        message: {
          uz: `Kurs sanalari tanlangan chorak oralig'ida bo'lishi kerak (${range})`,
          ru: `Даты курса должны быть в пределах выбранной четверти (${range})`,
          en: `Course dates must be inside the selected quarter range (${range})`,
        },
      });
    }
  }

  private async findCourseEntity(id: string): Promise<Course> {
    const course = await this.getCoursesRepository().findOne({
      where: { id },
      relations: this.courseRelations(),
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  private courseRelations() {
    return {
      quarter: true,
      room: true,
      subject: true,
      teacher: true,
      students: { currentClass: true },
    } as const;
  }

  private async findStudentsByIds(studentIds: string[]): Promise<Student[]> {
    const uniqueStudentIds = Array.from(new Set(studentIds));

    if (uniqueStudentIds.length === 0) {
      return [];
    }

    const students = await this.getStudentsRepository().find({
      where: { id: In(uniqueStudentIds) },
      relations: { currentClass: true },
      order: { lastName: "ASC", firstName: "ASC" },
    });

    if (students.length !== uniqueStudentIds.length) {
      throw new BadRequestException("Some selected students were not found");
    }

    return students;
  }

  private toCourseResponse(course: Course): CourseResponseDto {
    const students = course.students ?? [];

    return {
      id: course.id,
      name: course.name,
      quarter: this.toCourseQuarterBrief(course.quarter, course.quarterId),
      startDate: course.startDate,
      endDate: course.endDate,
      room: this.toCourseRoomBrief(course.room, course.roomId),
      description: course.description ?? null,
      subject: this.toCourseSubjectBrief(course.subject, course.subjectId),
      teacher: this.toCourseTeacherBrief(course.teacher, course.teacherId),
      stats: {
        plannedLessonCount: course.plannedLessonCount ?? 0,
        completedLessonCount: course.completedLessonCount ?? 0,
        studentCount: students.length,
        averageGrade: null,
      },
      status: course.status ?? CommonStatus.ACTIVE,
      createdAt: course.createdAt?.toISOString(),
      updatedAt: course.updatedAt?.toISOString(),
      version: course.version,
    };
  }

  private toCourseStudentRow(student: Student): CourseStudentRowDto {
    return {
      id: student.id,
      fullName: this.buildStudentFullName(student),
      studentCode: student.studentCode,
      gender: student.gender,
      className: student.currentClass?.name ?? null,
    };
  }

  private toCourseDetailResponse(course: Course): CourseDetailResponseDto {
    return {
      ...this.toCourseResponse(course),
      students: (course.students ?? []).map((student) => this.toCourseStudentRow(student)),
    };
  }

  private toCourseQuarterBrief(quarter: Quarter | undefined, quarterId: string) {
    return {
      id: quarter?.id ?? quarterId,
      quarterNumber: quarter?.quarterNumber ?? 0,
      name: quarter?.name?.uz ?? "",
      startDate: quarter?.startDate ?? "",
      endDate: quarter?.endDate ?? "",
    };
  }

  private toCourseRoomBrief(room: Room | undefined, roomId: string) {
    return {
      id: room?.id ?? roomId,
      roomNumber: room?.roomNumber ?? "",
      floor: room?.floor ?? 0,
      label: room ? this.buildRoomLabel(room) : "",
    };
  }

  private toCourseSubjectBrief(subject: Subject | undefined, subjectId: string) {
    const localizedName = this.ensureSubjectLocalizedName(subject?.name, subject?.code ?? "");

    return {
      id: subject?.id ?? subjectId,
      name: localizedName.uz,
      color: subject?.color ?? "#2563EB",
    };
  }

  private toCourseTeacherBrief(teacher: User | undefined, teacherId: string) {
    return {
      id: teacher?.id ?? teacherId,
      fullName: teacher ? this.buildUserFullName(teacher) : "",
      phone: teacher?.phone ?? null,
    };
  }

  private normalizeDisplayText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  private getCoursesRepository(): Repository<Course> {
    if (!this.courses) {
      throw new Error("Courses repository is not configured");
    }

    return this.courses;
  }

  private async buildClassInput(dto: CreateClassDto): Promise<ClassSaveInput> {
    const academicYear = await this.findAcademicYear(dto.academicYearId);
    const room = await this.findRoomEntity(dto.roomId);
    const curator = await this.findUserEntity(dto.curatorId);
    const section = this.normalizeClassSection(dto.section);
    const gradeLevel = dto.gradeLevel;

    return {
      name: this.buildClassName(gradeLevel, section),
      gradeLevel,
      section,
      language: dto.language,
      academicYearId: dto.academicYearId,
      roomId: dto.roomId,
      curatorId: dto.curatorId,
      capacity: dto.capacity ?? 30,
      classType: dto.classType,
      shift: dto.shift,
      academicYear,
      room,
      curator,
    };
  }

  private async ensureClassCanBeSaved(input: ClassSaveInput, excludeClassId?: string): Promise<void> {
    const excludedIdWhere = excludeClassId ? { id: Not(excludeClassId) } : {};
    const duplicateClass = await this.classes.findOne({
      where: {
        academicYearId: input.academicYearId,
        gradeLevel: input.gradeLevel,
        section: input.section,
        ...excludedIdWhere,
      },
    });

    if (duplicateClass) {
      throw new ConflictException("Class already exists for this academic year");
    }
  }

  private buildClassWhere(query: ClassQueryDto): FindOptionsWhere<SchoolClass> {
    return {
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.curatorId ? { curatorId: query.curatorId } : {}),
      ...(query.search ? { name: ILike("%" + query.search + "%") } : {}),
    };
  }

  private async findClassEntity(id: string): Promise<SchoolClass> {
    const schoolClass = await this.classes.findOne({
      where: { id },
      relations: { academicYear: true, room: true, curator: true },
    });

    if (!schoolClass) {
      throw new NotFoundException("Class not found");
    }

    return schoolClass;
  }

  private async findClassByAcademicYear(id: string, academicYearId: string): Promise<SchoolClass> {
    const schoolClass = await this.classes.findOne({ where: { id, academicYearId } });

    if (!schoolClass) {
      throw new NotFoundException("Class not found");
    }

    return schoolClass;
  }

  private async findRoomEntity(id: string): Promise<Room> {
    const room = await this.getRoomsRepository().findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    return room;
  }

  private async findUserEntity(id: string): Promise<User> {
    const user = await this.getUsersRepository().findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private async findStudentsByClassId(classId: string, studentIds?: string[]): Promise<Student[]> {
    return this.getStudentsRepository().find({
      where: {
        currentClassId: classId,
        ...(studentIds ? { id: In(studentIds) } : {}),
      },
      order: { lastName: "ASC", firstName: "ASC" },
    });
  }

  private toClassResponse(
    schoolClass: SchoolClass,
    students: Student[],
    metrics: Map<string, ClassMetric>,
  ): ClassResponseDto {
    const stats = this.buildClassStats(students, metrics);

    return {
      id: schoolClass.id,
      name: schoolClass.name,
      gradeLevel: schoolClass.gradeLevel,
      section: schoolClass.section,
      language: schoolClass.language,
      academicYear: {
        id: schoolClass.academicYear?.id ?? schoolClass.academicYearId,
        name: schoolClass.academicYear?.name ?? "",
      },
      room: schoolClass.room
        ? {
            id: schoolClass.room.id,
            roomNumber: schoolClass.room.roomNumber,
            floor: schoolClass.room.floor,
            label: this.buildRoomLabel(schoolClass.room),
          }
        : {
            id: schoolClass.roomId ?? "",
            roomNumber: "",
            floor: 0,
            label: "",
          },
      curator: schoolClass.curator
        ? {
            id: schoolClass.curator.id,
            fullName: this.buildUserFullName(schoolClass.curator),
            phone: schoolClass.curator.phone,
          }
        : {
            id: schoolClass.curatorId ?? "",
            fullName: "",
            phone: null,
          },
      stats,
      capacity: schoolClass.capacity,
      createdAt: schoolClass.createdAt?.toISOString(),
      updatedAt: schoolClass.updatedAt?.toISOString(),
      version: schoolClass.version,
    };
  }

  private buildClassStats(students: Student[], metrics: Map<string, ClassMetric>): ClassResponseDto["stats"] {
    const studentMetrics = students.map((student) => metrics.get(student.id));
    const masteryValues = studentMetrics.map((metric) => metric?.mastery ?? 0);
    const attendanceValues = studentMetrics.map((metric) => metric?.attendance ?? 0);

    return {
      studentCount: students.length,
      maleCount: students.filter((student) => student.gender === Gender.MALE).length,
      femaleCount: students.filter((student) => student.gender === Gender.FEMALE).length,
      averageMastery: this.average(masteryValues),
      averageAttendance: this.average(attendanceValues),
    };
  }

  private toClassStudentRow(student: Student, metrics: Map<string, ClassMetric>): ClassStudentRowDto {
    const metric = metrics.get(student.id);

    return {
      id: student.id,
      fullName: this.buildStudentFullName(student),
      gender: student.gender,
      studentCode: student.studentCode,
      mastery: metric?.mastery ?? 0,
      attendance: metric?.attendance ?? 0,
    };
  }

  /**
   * Compute per-student attendance percentage and average mastery in two
   * aggregate queries (no N+1). Attendance counts present/late/excused as
   * "in attendance"; mastery is the average of journal grades (0–5 scale).
   */
  private async computeClassMetrics(studentIds: string[]): Promise<Map<string, ClassMetric>> {
    const metrics = new Map<string, ClassMetric>();
    if (studentIds.length === 0) {
      return metrics;
    }

    const uniqueIds = Array.from(new Set(studentIds));
    for (const id of uniqueIds) {
      metrics.set(id, { attendance: 0, mastery: 0 });
    }

    const attendanceRepo = this.attendanceRecords;
    if (attendanceRepo) {
      const rows = await attendanceRepo
        .createQueryBuilder("a")
        .select("a.student_id", "studentId")
        .addSelect("COUNT(*)", "total")
        .addSelect(
          "COUNT(*) FILTER (WHERE a.status IN (:...present))",
          "present",
        )
        .where("a.student_id IN (:...ids)", { ids: uniqueIds })
        .setParameter("present", [
          AttendanceStatus.PRESENT,
          AttendanceStatus.LATE,
          AttendanceStatus.EXCUSED,
        ])
        .groupBy("a.student_id")
        .getRawMany<{ studentId: string; total: string; present: string }>();

      for (const row of rows) {
        const total = Number(row.total);
        const present = Number(row.present);
        const metric = metrics.get(row.studentId);
        if (metric && total > 0) {
          metric.attendance = this.round1((present / total) * 100);
        }
      }
    }

    const journalRepo = this.journalEntries;
    if (journalRepo) {
      const rows = await journalRepo
        .createQueryBuilder("j")
        .select("j.student_id", "studentId")
        .addSelect("AVG(j.grade)", "avgGrade")
        .where("j.student_id IN (:...ids)", { ids: uniqueIds })
        .andWhere("j.grade IS NOT NULL")
        .groupBy("j.student_id")
        .getRawMany<{ studentId: string; avgGrade: string | null }>();

      for (const row of rows) {
        const metric = metrics.get(row.studentId);
        if (metric && row.avgGrade !== null) {
          metric.mastery = this.round1(Number(row.avgGrade));
        }
      }
    }

    return metrics;
  }

  private async findStudentsForClasses(classIds: string[]): Promise<Map<string, Student[]>> {
    const grouped = new Map<string, Student[]>();
    if (classIds.length === 0) {
      return grouped;
    }

    const students = await this.getStudentsRepository().find({
      where: { currentClassId: In(classIds) },
      order: { lastName: "ASC", firstName: "ASC" },
    });

    for (const student of students) {
      const classId = student.currentClassId;
      if (!classId) {
        continue;
      }
      const bucket = grouped.get(classId) ?? [];
      bucket.push(student);
      grouped.set(classId, bucket);
    }

    return grouped;
  }

  private buildClassListStats(items: ClassResponseDto[]): ClassListStatsDto {
    return {
      totalClasses: items.length,
      totalStudents: items.reduce((sum, item) => sum + item.stats.studentCount, 0),
      languages: {
        uz: items.filter((item) => item.language === ClassLanguage.UZ).length,
        ru: items.filter((item) => item.language === ClassLanguage.RU).length,
        en: items.filter((item) => item.language === ClassLanguage.EN).length,
      },
    };
  }

  private async resolveSmsBody(dto: SendClassSmsDto): Promise<string> {
    if (dto.body && dto.body.trim().length > 0) {
      return dto.body.trim();
    }

    if (dto.templateId && this.communicationService) {
      const template = await this.communicationService.findTemplateById(dto.templateId);
      return template.body;
    }

    throw new BadRequestException("Either a template or a message body is required");
  }

  private resolveStudentPhone(student: Student): string | null {
    const parents = student.parents ?? [];
    if (parents.length === 0) {
      return null;
    }

    const primary = parents.find((link) => link.isPrimary) ?? parents[0];
    const phone = primary?.parent?.phone?.trim();
    return phone && phone.length > 0 ? phone : null;
  }

  private resolveScheduledAt(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      return null;
    }

    return date;
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return this.round1(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private buildClassName(gradeLevel: number, section: string): string {
    return gradeLevel + "-" + section;
  }

  private normalizeClassSection(value: string): string {
    return value.trim().toUpperCase();
  }

  private buildRoomLabel(room: Room): string {
    return room.floor + "-qavat " + room.roomNumber;
  }

  private buildUserFullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  }

  private buildStudentFullName(student: Student): string {
    return [student.lastName, student.firstName].filter(Boolean).join(" ").trim();
  }

  private getRoomsRepository(): Repository<Room> {
    if (!this.rooms) {
      throw new Error("Rooms repository is not configured");
    }

    return this.rooms;
  }

  private getUsersRepository(): Repository<User> {
    if (!this.users) {
      throw new Error("Users repository is not configured");
    }

    return this.users;
  }

  private getStudentsRepository(): Repository<Student> {
    if (!this.students) {
      throw new Error("Students repository is not configured");
    }

    return this.students;
  }

  private normalizeLessonTime(value: string): string {
    const [hour, minute] = value.split(":");
    return hour.padStart(2, "0") + ":" + minute + ":00";
  }

  private formatLessonTime(value: string): string {
    return value.slice(0, 5);
  }

  private toMinutes(value: string): number {
    const [hour, minute] = this.formatLessonTime(value).split(":").map(Number);
    return hour * 60 + minute;
  }

  private toDate(value: string): number {
    const timestamp = Date.parse(value + "T00:00:00.000Z");
    if (Number.isNaN(timestamp)) {
      throw new BadRequestException("Invalid date value");
    }

    return timestamp;
  }
}
