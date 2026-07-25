import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { Course } from '../academic/entities/course.entity';
import { LessonPeriod } from '../academic/entities/lesson-period.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { Teacher } from '../hr/entities/teacher.entity';
import { User } from '../identity/entities/user.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LessonStatus } from './enums/lms.enums';
import {
  CreateScheduleCellDto,
  GenerateScheduleDto,
  ScheduleEditScope,
  ScheduleGenerateMode,
  SubstituteTeacherDto,
  UpdateScheduleCellDto,
} from './dto/schedule.dto';

/** Boshlang'ich sinflar chegarasi: gradeLevel <= shu qiymat. */
const PRIMARY_GRADE_MAX = 4;
/** O'quv haftasi: Dushanba–Juma (ISO 1..5). */
const WORK_DAYS = [1, 2, 3, 4, 5];

export interface ScheduleActor {
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(LessonSchedule) private readonly lessons: Repository<LessonSchedule>,
    @InjectRepository(SchoolClass) private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Quarter) private readonly quarters: Repository<Quarter>,
    @InjectRepository(LessonPeriod) private readonly periods: Repository<LessonPeriod>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Teacher) private readonly hrTeachers: Repository<Teacher>,
    private readonly tenant: TenantContextService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() @InjectRepository(AuditLog) private readonly auditLogs?: Repository<AuditLog>,
  ) {}

  // ============================================================ Read: tanlovlar

  async getClasses(quarterId: string) {
    const quarter = await this.loadQuarter(quarterId);
    const classes = await this.classes.find({
      where: tenantWhere<SchoolClass>(this.tenant, { academicYearId: quarter.academicYearId }, { branch: true }),
      relations: { curator: true },
      order: { gradeLevel: 'ASC', section: 'ASC' },
    });
    const map = (c: SchoolClass) => ({
      id: c.id,
      name: c.name,
      gradeLevel: c.gradeLevel,
      section: c.section,
      curatorName: c.curator ? this.fullName(c.curator) : null,
    });
    return {
      primary: classes.filter((c) => c.gradeLevel <= PRIMARY_GRADE_MAX).map(map),
      high: classes.filter((c) => c.gradeLevel > PRIMARY_GRADE_MAX).map(map),
    };
  }

  /**
   * Jadval selektorlari uchun o'qituvchilar ro'yxati — HR registri (hr_teachers).
   * Dars jadvalidagi teacher_id endi hr_teachers'ga ishora qiladi.
   */
  async getTeachers() {
    const teachers = await this.hrTeachers.find({
      where: tenantWhere<Teacher>(this.tenant, {}, { branch: true }),
      relations: { staffMember: true },
    });
    return {
      items: teachers
        .map((t) => ({ id: t.id, fullName: this.teacherFullName(t) }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    };
  }

  // ============================================================ Read: grid

  async getGrid(quarterId: string, classId: string) {
    const quarter = await this.loadQuarter(quarterId);
    const periods = await this.loadPeriods();
    const lessons = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(this.tenant, { classId, quarterId }, { branch: true }),
      relations: { subject: true, teacher: { staffMember: true }, room: true, course: true, lessonPeriod: true },
    });
    const cells = this.buildCells(lessons, (l) => ({
      id: l.id,
      subjectId: l.subjectId,
      subjectName: l.subject?.name ?? null,
      subjectColor: l.subject?.color ?? null,
      teacherId: l.teacherId ?? null,
      teacherName: l.teacher ? this.teacherFullName(l.teacher) : null,
      roomId: l.roomId ?? null,
      roomName: l.room?.roomNumber ?? null,
      courseId: l.courseId ?? null,
      courseName: l.course?.name ?? null,
      isSubstituted: !!l.originalTeacherId,
    }));
    return { quarterId, classId, days: WORK_DAYS, periods, cells, subjects: await this.legend(quarter) };
  }

  async getTeacherGrid(quarterId: string, teacherId: string) {
    const quarter = await this.loadQuarter(quarterId);
    const periods = await this.loadPeriods();
    const lessons = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(this.tenant, { quarterId, teacherId }, { branch: true }),
      relations: { subject: true, class: true, room: true, course: true, lessonPeriod: true },
    });
    const cells = this.buildCells(lessons, (l) => ({
      id: l.id,
      subjectId: l.subjectId,
      subjectName: l.subject?.name ?? null,
      subjectColor: l.subject?.color ?? null,
      classId: l.classId,
      className: l.class?.name ?? null,
      roomId: l.roomId ?? null,
      roomName: l.room?.roomNumber ?? null,
      courseId: l.courseId ?? null,
      isSubstituted: !!l.originalTeacherId,
    }));
    return { quarterId, teacherId, days: WORK_DAYS, periods, cells, subjects: await this.legend(quarter) };
  }

  /**
   * Chorak bo'yicha to'liq ko'rinish: darslarni haftalik shablonga SIQMAY,
   * har bir real hafta va sanasi bilan qaytaradi. Sinf yoki o'qituvchi talab qilinadi.
   */
  async getQuarterView(quarterId: string, opts: { classId?: string; teacherId?: string }) {
    if (!opts.classId && !opts.teacherId) {
      throw new BadRequestException('classId yoki teacherId talab qilinadi.');
    }
    const quarter = await this.loadQuarter(quarterId);
    const periods = await this.loadPeriods();
    const filter: Record<string, unknown> = { quarterId };
    if (opts.classId) filter.classId = opts.classId;
    if (opts.teacherId) filter.teacherId = opts.teacherId;
    const mode: 'class' | 'teacher' = opts.teacherId && !opts.classId ? 'teacher' : 'class';
    const lessons = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(this.tenant, filter, { branch: true }),
      relations: { subject: true, teacher: { staffMember: true }, class: true, room: true, course: true, lessonPeriod: true },
    });

    const today = this.currentDate();
    const weekMap = new Map(
      this.enumerateWeeks(quarter.startDate, quarter.endDate).map((w) => [
        w.startDate,
        {
          ...w,
          isCurrent: today >= w.startDate && today <= w.endDate,
          cells: {} as Record<string, ReturnType<ScheduleService['projectQuarterCell']>>,
        },
      ]),
    );
    for (const l of lessons) {
      if (l.weekday == null || l.lessonPeriodId == null) continue;
      const bucket = weekMap.get(this.mondayOf(l.lessonDate));
      if (!bucket) continue;
      bucket.cells[`${l.weekday}:${l.lessonPeriodId}`] = this.projectQuarterCell(l, mode);
    }

    // Darssiz haftalarni chiqarib tashlaymiz (masalan chorak hafta o'rtasidan boshlansa).
    const weeks = Array.from(weekMap.values()).filter((w) => Object.keys(w.cells).length > 0);

    return {
      quarterId,
      classId: opts.classId ?? null,
      teacherId: opts.teacherId ?? null,
      startDate: quarter.startDate,
      endDate: quarter.endDate,
      days: WORK_DAYS,
      periods,
      weeks,
      subjects: await this.legend(quarter),
    };
  }

  /** Bitta darsni chorak ko'rinishi katagiga proyeksiya qiladi (sana bilan). */
  private projectQuarterCell(l: LessonSchedule, mode: 'class' | 'teacher') {
    const base = {
      id: l.id,
      subjectId: l.subjectId,
      subjectName: l.subject?.name ?? null,
      subjectColor: l.subject?.color ?? null,
      roomId: l.roomId ?? null,
      roomName: l.room?.roomNumber ?? null,
      courseId: l.courseId ?? null,
      courseName: l.course?.name ?? null,
      lessonDate: l.lessonDate,
      weekday: l.weekday,
      isSubstituted: !!l.originalTeacherId,
      classId: l.classId as string | undefined,
      className: l.class?.name ?? null,
      teacherId: (l.teacherId ?? null) as string | null,
      teacherName: l.teacher ? this.teacherFullName(l.teacher) : null,
    };
    // mode faqat frontend uchun asosiy ustunni belgilaydi; ikkala maydon ham qaytadi.
    void mode;
    return base;
  }

  // ============================================================ Mutation: katak

  async createCell(dto: CreateScheduleCellDto, actor?: ScheduleActor) {
    const quarter = await this.loadQuarter(dto.quarterId);
    const resolved = await this.resolveSubjectSource(dto.subjectId, dto.courseId, dto.teacherId, dto.roomId);

    const lowerBound = dto.fromToday ? this.maxDate(quarter.startDate, this.currentDate()) : quarter.startDate;
    const dates = this.enumerateDates(lowerBound, quarter.endDate, dto.weekday);
    if (dates.length === 0) {
      return { created: 0 };
    }
    const existing = await this.lessons.find({
      where: { classId: dto.classId, lessonPeriodId: dto.lessonPeriodId, lessonDate: In(dates) },
      select: { lessonDate: true },
    });
    const taken = new Set(existing.map((l) => l.lessonDate));
    const toCreate = dates
      .filter((d) => !taken.has(d))
      .map((lessonDate) =>
        this.lessons.create({
          classId: dto.classId,
          quarterId: dto.quarterId,
          subjectId: resolved.subjectId,
          teacherId: resolved.teacherId,
          roomId: resolved.roomId,
          courseId: dto.courseId ?? null,
          lessonPeriodId: dto.lessonPeriodId,
          lessonDate,
          weekday: dto.weekday,
          status: LessonStatus.PLANNED,
        }),
      );
    if (toCreate.length) {
      await this.lessons.save(toCreate);
    }
    await this.audit(actor, 'lesson_schedule.cell_created', dto.classId, {
      quarterId: dto.quarterId,
      classId: dto.classId,
      weekday: dto.weekday,
      lessonPeriodId: dto.lessonPeriodId,
      subjectId: resolved.subjectId,
      created: toCreate.length,
    });
    return { created: toCreate.length };
  }

  async updateCell(id: string, dto: UpdateScheduleCellDto, actor?: ScheduleActor) {
    const rep = await this.lessons.findOne({ where: tenantWhere<LessonSchedule>(this.tenant, { id }, { branch: true }) });
    if (!rep) throw new NotFoundException('Lesson not found');
    const scope = dto.scope ?? ScheduleEditScope.FUTURE;
    const resolved = await this.resolveSubjectSource(
      dto.subjectId ?? rep.subjectId,
      dto.courseId ?? rep.courseId ?? undefined,
      dto.teacherId,
      dto.roomId,
    );

    // Qamrovga mos qatorlar (manba slotdan).
    const rows = await this.rowsForScope(rep, scope);
    if (!rows.length) return { updated: 0 };

    // Yakuniy qiymatlar va o'zgargan maydonlar.
    const finalTeacherId = resolved.teacherId ?? null;
    const finalRoomId = resolved.roomId ?? null;
    const finalClassId = dto.classId ?? rep.classId;
    const teacherChanged = finalTeacherId !== (rep.teacherId ?? null);
    const roomChanged = finalRoomId !== (rep.roomId ?? null);
    const classChanged = finalClassId !== rep.classId;

    // Qat'iy konflikt tekshiruvi — faqat o'zgargan maydonlar bo'yicha.
    if (teacherChanged || roomChanged || classChanged) {
      await this.assertNoConflict(rows, {
        teacherId: teacherChanged ? finalTeacherId : null,
        roomId: roomChanged ? finalRoomId : null,
        classId: classChanged ? finalClassId : null,
      });
    }

    const patch: {
      subjectId: string;
      courseId?: string | null;
      teacherId?: string | null;
      roomId?: string | null;
      classId?: string;
    } = { subjectId: resolved.subjectId };
    if (dto.courseId !== undefined) patch.courseId = dto.courseId ?? null;
    patch.teacherId = finalTeacherId;
    patch.roomId = finalRoomId;
    if (classChanged) patch.classId = finalClassId;

    const result = await this.lessons.update({ id: In(rows.map((r) => r.id)) }, patch);
    await this.audit(actor, 'lesson_schedule.cell_updated', finalClassId, {
      quarterId: rep.quarterId,
      classId: finalClassId,
      fromClassId: classChanged ? rep.classId : undefined,
      weekday: rep.weekday,
      lessonPeriodId: rep.lessonPeriodId,
      subjectId: resolved.subjectId,
      scope,
      updated: result.affected ?? 0,
    });
    return { updated: result.affected ?? 0 };
  }

  /** Qamrovga mos darslar ro'yxati (manba sinf slotidan). */
  private rowsForScope(rep: LessonSchedule, scope: ScheduleEditScope): Promise<LessonSchedule[]> {
    const base = tenantWhere<LessonSchedule>(
      this.tenant,
      {
        classId: rep.classId,
        lessonPeriodId: rep.lessonPeriodId ?? undefined,
        weekday: rep.weekday ?? undefined,
        quarterId: rep.quarterId ?? undefined,
        deletedAt: IsNull(),
      },
      { branch: true },
    );
    if (scope === ScheduleEditScope.SINGLE) {
      return this.lessons.find({ where: { ...base, lessonDate: rep.lessonDate } });
    }
    if (scope === ScheduleEditScope.ALL) {
      return this.lessons.find({ where: base });
    }
    return this.lessons.find({ where: { ...base, lessonDate: MoreThanOrEqual(this.currentDate()) } });
  }

  /** Berilgan qatorlarga yangi o'qituvchi/xona/sinf qo'yilsa konflikt bormi — bo'lsa 409. */
  private async assertNoConflict(
    rows: LessonSchedule[],
    target: { teacherId: string | null; roomId: string | null; classId: string | null },
  ) {
    if (!target.teacherId && !target.roomId && !target.classId) return;
    const rowIds = new Set(rows.map((r) => r.id));
    const dates = Array.from(new Set(rows.map((r) => r.lessonDate)));
    const periodId = rows[0]?.lessonPeriodId ?? undefined;
    const others = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(
        this.tenant,
        { quarterId: rows[0]?.quarterId ?? undefined, lessonPeriodId: periodId, lessonDate: In(dates) },
        { branch: true },
      ),
      relations: { class: true, teacher: { staffMember: true }, room: true },
    });
    const conflicts: Array<{ type: 'teacher' | 'room' | 'class'; date: string; entityName: string | null; className: string | null }> = [];
    for (const o of others) {
      if (rowIds.has(o.id)) continue;
      if (target.teacherId && o.teacherId === target.teacherId) {
        conflicts.push({ type: 'teacher', date: o.lessonDate, entityName: o.teacher ? this.teacherFullName(o.teacher) : null, className: o.class?.name ?? null });
      }
      if (target.roomId && o.roomId === target.roomId) {
        conflicts.push({ type: 'room', date: o.lessonDate, entityName: o.room?.roomNumber ?? null, className: o.class?.name ?? null });
      }
      if (target.classId && o.classId === target.classId) {
        conflicts.push({ type: 'class', date: o.lessonDate, entityName: o.class?.name ?? null, className: o.class?.name ?? null });
      }
    }
    if (conflicts.length) {
      throw new ConflictException({ code: 'SCHEDULE_CONFLICT', details: conflicts.slice(0, 20) });
    }
  }

  /** Aniq sana + parada band o'qituvchi/xona/sinf identifikatorlari. */
  async getAvailability(quarterId: string, lessonDate: string, lessonPeriodId: string, excludeId?: string) {
    const rows = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(
        this.tenant,
        { quarterId, lessonDate, lessonPeriodId, deletedAt: IsNull() },
        { branch: true },
      ),
    });
    const busyTeacherIds = new Set<string>();
    const busyRoomIds = new Set<string>();
    const busyClassIds = new Set<string>();
    for (const l of rows) {
      if (excludeId && l.id === excludeId) continue;
      if (l.teacherId) busyTeacherIds.add(l.teacherId);
      if (l.roomId) busyRoomIds.add(l.roomId);
      if (l.classId) busyClassIds.add(l.classId);
    }
    return {
      lessonDate,
      lessonPeriodId,
      busyTeacherIds: Array.from(busyTeacherIds),
      busyRoomIds: Array.from(busyRoomIds),
      busyClassIds: Array.from(busyClassIds),
    };
  }

  async deleteCell(id: string, actor?: ScheduleActor) {
    const rep = await this.lessons.findOne({ where: tenantWhere<LessonSchedule>(this.tenant, { id }, { branch: true }) });
    if (!rep) throw new NotFoundException('Lesson not found');
    const where = this.cellWhere(rep, this.currentDate());
    const result = await this.lessons.softDelete(where);
    await this.audit(actor, 'lesson_schedule.cell_deleted', rep.classId, {
      quarterId: rep.quarterId,
      classId: rep.classId,
      weekday: rep.weekday,
      lessonPeriodId: rep.lessonPeriodId,
      deleted: result.affected ?? 0,
    });
    return { deleted: result.affected ?? 0 };
  }

  // ============================================================ Avtogeneratsiya

  async preview(dto: GenerateScheduleDto) {
    const quarter = await this.loadQuarter(dto.quarterId);
    const items = await this.describeDistribution(dto, quarter.academicYearId);
    const dailyCapacity = dto.days.length * dto.maxPerDay;
    const subjectWeeklyCap = dto.days.length * dto.maxPerSubjectPerDay;

    const perClassLoad = new Map<string, number>();
    for (const it of items) perClassLoad.set(it.classId, (perClassLoad.get(it.classId) ?? 0) + it.hoursPerWeek);

    let valid = items.length > 0;
    let message: string | null = items.length ? null : "To'liq fan taqsimoti yo'q — 2-bosqichga qayting.";
    for (const it of items) {
      if (it.hoursPerWeek > subjectWeeklyCap) {
        valid = false;
        message = `${it.subjectName ?? it.subjectId}: haftalik soat (${it.hoursPerWeek}) ruxsat etilgan maksimumdan (${subjectWeeklyCap}) oshib ketdi.`;
        break;
      }
    }
    if (valid) {
      for (const [classId, load] of perClassLoad) {
        if (load > dailyCapacity) {
          valid = false;
          const cls = items.find((i) => i.classId === classId);
          message = `${cls?.className ?? classId}: umumiy soat (${load}) kunlik sig'imdan (${dailyCapacity}) oshib ketdi.`;
          break;
        }
      }
    }

    return {
      days: dto.days.length,
      maxPerDay: dto.maxPerDay,
      toCreate: items.filter((i) => i.status === 'add').length,
      toUpdate: items.filter((i) => i.status === 'update').length,
      distribution: items,
      valid,
      message,
    };
  }

  async generate(dto: GenerateScheduleDto, actor?: ScheduleActor) {
    const quarter = await this.loadQuarter(dto.quarterId);
    const periods = await this.loadPeriods();
    if (periods.length === 0) {
      throw new BadRequestException('Dars vaqtlari (lesson periods) sozlanmagan.');
    }
    const slotCount = Math.min(dto.maxPerDay, periods.length);
    const classIds = Array.from(new Set(dto.distribution.map((d) => d.classId)));

    let updated = 0;
    if (dto.mode === ScheduleGenerateMode.REFRESH) {
      const res = await this.lessons.softDelete({
        classId: In(classIds),
        quarterId: dto.quarterId,
        lessonDate: MoreThanOrEqual(this.currentDate()),
        status: LessonStatus.PLANNED,
        deletedAt: IsNull(),
      });
      updated = res.affected ?? 0;
    }

    // Mavjud (qolgan) jadval bandligini hisobga olish — o'qituvchi/xona to'qnashmasligi uchun.
    const teacherBusy = new Set<string>();
    const roomBusy = new Set<string>();
    const classSlot = new Set<string>();
    const existing = await this.lessons.find({ where: tenantWhere<LessonSchedule>(this.tenant, { quarterId: dto.quarterId }, { branch: true }) });
    const periodIndex = new Map(periods.map((p, i) => [p.id, i] as const));
    for (const l of existing) {
      if (l.weekday == null || l.lessonPeriodId == null) continue;
      const slot = periodIndex.get(l.lessonPeriodId);
      if (slot == null) continue;
      classSlot.add(`${l.classId}:${l.weekday}:${slot}`);
      if (l.teacherId) teacherBusy.add(`${l.weekday}:${slot}:${l.teacherId}`);
      if (l.roomId) roomBusy.add(`${l.weekday}:${slot}:${l.roomId}`);
    }

    let created = 0;
    let skipped = 0;
    const conflicts: Array<{ classId: string; subjectId: string; reason: string }> = [];

    // Sinf bo'yicha guruhlash; og'irroq (ko'p soatli) fanlarni avval joylash.
    const byClass = new Map<string, GenerateScheduleDto['distribution']>();
    for (const item of dto.distribution) {
      (byClass.get(item.classId) ?? byClass.set(item.classId, []).get(item.classId)!).push(item);
    }

    for (const [classId, classItems] of byClass) {
      const classDayCount = new Map<number, number>();
      const subjectDayCount = new Map<string, number>();
      classItems.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

      for (const item of classItems) {
        const src = await this.resolveSubjectSource(item.subjectId, item.courseId, item.teacherId, item.roomId);
        let placed = 0;
        for (let h = 0; h < item.hoursPerWeek; h++) {
          const slot = this.findSlot(
            classId,
            src,
            dto.days,
            slotCount,
            dto.maxPerDay,
            dto.maxPerSubjectPerDay,
            classDayCount,
            subjectDayCount,
            classSlot,
            teacherBusy,
            roomBusy,
            item.subjectId,
          );
          if (!slot) {
            skipped++;
            conflicts.push({ classId, subjectId: item.subjectId, reason: 'no_slot' });
            break;
          }
          const { day, slotIdx } = slot;
          classSlot.add(`${classId}:${day}:${slotIdx}`);
          if (src.teacherId) teacherBusy.add(`${day}:${slotIdx}:${src.teacherId}`);
          if (src.roomId) roomBusy.add(`${day}:${slotIdx}:${src.roomId}`);
          classDayCount.set(day, (classDayCount.get(day) ?? 0) + 1);
          subjectDayCount.set(`${day}:${item.subjectId}`, (subjectDayCount.get(`${day}:${item.subjectId}`) ?? 0) + 1);
          created += await this.materialize(quarter, classId, dto.quarterId, periods[slotIdx], day, src, item.courseId);
          placed++;
        }
        void placed;
      }
    }

    await this.audit(actor, 'lesson_schedule.generated', dto.quarterId, {
      quarterId: dto.quarterId,
      mode: dto.mode,
      created,
      updated,
      skipped,
    });
    return { created, updated, skipped, conflicts };
  }

  // ============================================================ Almashtirish

  async substitute(dto: SubstituteTeacherDto, actor?: ScheduleActor) {
    const upcoming = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(this.tenant, {
        classId: dto.classId,
        subjectId: dto.subjectId,
        lessonPeriodId: dto.lessonPeriodId,
        weekday: dto.weekday,
        quarterId: dto.quarterId,
        lessonDate: MoreThanOrEqual(this.currentDate()),
      }, { branch: true }),
      order: { lessonDate: 'ASC' },
      take: dto.count,
    });
    for (const lesson of upcoming) {
      if (!lesson.originalTeacherId) lesson.originalTeacherId = lesson.teacherId ?? null;
      lesson.teacherId = dto.substituteTeacherId;
    }
    if (upcoming.length) await this.lessons.save(upcoming);
    await this.audit(actor, 'lesson_schedule.substituted', dto.classId, {
      quarterId: dto.quarterId,
      classId: dto.classId,
      subjectId: dto.subjectId,
      lessonPeriodId: dto.lessonPeriodId,
      weekday: dto.weekday,
      substituteTeacherId: dto.substituteTeacherId,
      substituted: upcoming.length,
    });
    return { substituted: upcoming.length };
  }

  // ============================================================ Ziddiyatlar

  async getConflicts(quarterId: string) {
    await this.loadQuarter(quarterId);
    const lessons = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(this.tenant, { quarterId }, { branch: true }),
      relations: { subject: true, teacher: { staffMember: true }, room: true, class: true, lessonPeriod: true },
    });
    // Haftalik vakillarga qisqartirish (har bir sana takrorini hisobga olmaslik).
    const weekly = new Map<string, LessonSchedule>();
    for (const l of lessons) {
      if (l.weekday == null || l.lessonPeriodId == null) continue;
      const key = `${l.weekday}:${l.lessonPeriodId}:${l.classId}:${l.subjectId}:${l.teacherId ?? ''}:${l.roomId ?? ''}`;
      if (!weekly.has(key)) weekly.set(key, l);
    }
    const reps = Array.from(weekly.values());
    const conflicts: Array<Record<string, unknown>> = [];

    const groupBy = (keyFn: (l: LessonSchedule) => string | null) => {
      const groups = new Map<string, LessonSchedule[]>();
      for (const l of reps) {
        const k = keyFn(l);
        if (k == null) continue;
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(l);
      }
      return groups;
    };

    const slotLabel = (l: LessonSchedule) => l.lessonPeriod?.code ?? '';

    for (const group of groupBy((l) => (l.teacherId ? `${l.weekday}:${l.lessonPeriodId}:${l.teacherId}` : null)).values()) {
      const classesInvolved = new Set(group.map((g) => g.classId));
      if (classesInvolved.size > 1) {
        const first = group[0];
        conflicts.push({
          type: 'teacher',
          weekday: first.weekday,
          lessonPeriodId: first.lessonPeriodId,
          periodCode: slotLabel(first),
          entityName: first.teacher ? this.teacherFullName(first.teacher) : null,
          classes: group.map((g) => g.class?.name).filter(Boolean),
        });
      }
    }
    for (const group of groupBy((l) => (l.roomId ? `${l.weekday}:${l.lessonPeriodId}:${l.roomId}` : null)).values()) {
      const classesInvolved = new Set(group.map((g) => g.classId));
      if (classesInvolved.size > 1) {
        const first = group[0];
        conflicts.push({
          type: 'room',
          weekday: first.weekday,
          lessonPeriodId: first.lessonPeriodId,
          periodCode: slotLabel(first),
          entityName: first.room?.roomNumber ?? null,
          classes: group.map((g) => g.class?.name).filter(Boolean),
        });
      }
    }
    for (const group of groupBy((l) => `${l.weekday}:${l.lessonPeriodId}:${l.classId}`).values()) {
      const subjects = new Set(group.map((g) => g.subjectId));
      if (subjects.size > 1) {
        const first = group[0];
        conflicts.push({
          type: 'class',
          weekday: first.weekday,
          lessonPeriodId: first.lessonPeriodId,
          periodCode: slotLabel(first),
          entityName: first.class?.name ?? null,
          subjects: group.map((g) => g.subject?.name).filter(Boolean),
        });
      }
    }
    return { quarterId, total: conflicts.length, conflicts };
  }

  // ============================================================ O'zgarishlar tarixi

  async getHistory(quarterId: string, classId?: string) {
    if (!this.auditLogs) return { items: [] };
    const qb = this.auditLogs
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.entity = :entity', { entity: 'lesson_schedule' })
      .andWhere(`audit.details_json ->> 'quarterId' = :quarterId`, { quarterId })
      .orderBy('audit.createdAt', 'DESC')
      .limit(200);
    if (classId) qb.andWhere(`audit.details_json ->> 'classId' = :classId`, { classId });
    const rows = await qb.getMany();
    return {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        actorName: r.user ? this.fullName(r.user) : null,
        createdAt: r.createdAt,
        details: r.details ?? null,
      })),
    };
  }

  // ============================================================ Helpers

  private async loadQuarter(id: string): Promise<Quarter> {
    const quarter = await this.quarters.findOne({ where: { id } });
    if (!quarter) throw new NotFoundException('Quarter not found');
    return quarter;
  }

  private loadPeriods() {
    return this.periods.find({ order: { order: 'ASC' } }).then((rows) =>
      rows.map((p) => ({ id: p.id, code: p.code, startTime: p.startTime, endTime: p.endTime, order: p.order })),
    );
  }

  private async legend(quarter: Quarter) {
    // Sinf gridining ostidagi fan-ranglar afsonasi: shu o'quv yilidagi darslarda ishlatilgan fanlar.
    const rows = await this.lessons.find({
      where: tenantWhere<LessonSchedule>(this.tenant, { quarterId: quarter.id }, { branch: true }),
      relations: { subject: true },
    });
    const seen = new Map<string, { id: string; name: unknown; color: string }>();
    for (const l of rows) {
      if (l.subject && !seen.has(l.subjectId)) {
        seen.set(l.subjectId, { id: l.subjectId, name: l.subject.name, color: l.subject.color });
      }
    }
    return Array.from(seen.values());
  }

  /** Berilgan darslardan haftalik grid kataklarini quradi: kalit `${weekday}:${periodId}`. */
  private buildCells<T>(lessons: LessonSchedule[], project: (l: LessonSchedule) => T): Record<string, T> {
    const today = this.currentDate();
    const groups = new Map<string, LessonSchedule[]>();
    for (const l of lessons) {
      if (l.weekday == null || l.lessonPeriodId == null) continue;
      const key = `${l.weekday}:${l.lessonPeriodId}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(l);
    }
    const cells: Record<string, T> = {};
    for (const [key, group] of groups) {
      const future = group.filter((l) => l.lessonDate >= today).sort((a, b) => a.lessonDate.localeCompare(b.lessonDate));
      const rep = future[0] ?? group.sort((a, b) => b.lessonDate.localeCompare(a.lessonDate))[0];
      cells[key] = project(rep);
    }
    return cells;
  }

  /** Bir katakka tegishli bugun va kelgusi darslarni topish sharti. */
  private cellWhere(rep: LessonSchedule, today: string) {
    const where: Record<string, unknown> = {
      classId: rep.classId,
      lessonPeriodId: rep.lessonPeriodId ?? undefined,
      weekday: rep.weekday ?? undefined,
      lessonDate: MoreThanOrEqual(today),
      // Faqat aktiv darslarga ta'sir qilsin — softDelete/update allaqachon o'chirilgan
      // qatorlarni qayta belgilamasligi uchun.
      deletedAt: IsNull(),
    };
    if (rep.quarterId) where.quarterId = rep.quarterId;
    return where;
  }

  /** courseId berilgan bo'lsa, fan/o'qituvchi/xonani kursdan oladi; aks holda berilganlarni qaytaradi. */
  private async resolveSubjectSource(
    subjectId: string | undefined,
    courseId: string | undefined | null,
    teacherId: string | undefined,
    roomId: string | undefined,
  ): Promise<{ subjectId: string; teacherId?: string | null; roomId?: string | null }> {
    if (courseId) {
      const course = await this.courses.findOne({ where: { id: courseId } });
      if (!course) throw new NotFoundException('Course not found');
      return {
        subjectId: subjectId ?? course.subjectId,
        // Kurs o'qituvchisi hali User'ga bog'langan — jadval esa hr_teachers'ga.
        // User id'ni xodim (staff_member.user_id) orqali HR o'qituvchiga o'giramiz.
        teacherId: teacherId ?? (await this.hrTeacherIdByUserId(course.teacherId)),
        roomId: roomId ?? course.roomId,
      };
    }
    if (!subjectId) {
      throw new BadRequestException('subjectId yoki courseId talab qilinadi.');
    }
    return { subjectId, teacherId: teacherId ?? null, roomId: roomId ?? null };
  }

  private findSlot(
    classId: string,
    src: { teacherId?: string | null; roomId?: string | null },
    days: number[],
    slotCount: number,
    maxPerDay: number,
    maxPerSubjectPerDay: number,
    classDayCount: Map<number, number>,
    subjectDayCount: Map<string, number>,
    classSlot: Set<string>,
    teacherBusy: Set<string>,
    roomBusy: Set<string>,
    subjectId: string,
  ): { day: number; slotIdx: number } | null {
    // Kunlarni eng kam yuklangandan boshlab tanlash — bir tekis taqsimot.
    const sortedDays = [...days].sort((a, b) => (classDayCount.get(a) ?? 0) - (classDayCount.get(b) ?? 0));
    for (const day of sortedDays) {
      if ((classDayCount.get(day) ?? 0) >= maxPerDay) continue;
      if ((subjectDayCount.get(`${day}:${subjectId}`) ?? 0) >= maxPerSubjectPerDay) continue;
      for (let slotIdx = 0; slotIdx < slotCount; slotIdx++) {
        if (classSlot.has(`${classId}:${day}:${slotIdx}`)) continue;
        if (src.teacherId && teacherBusy.has(`${day}:${slotIdx}:${src.teacherId}`)) continue;
        if (src.roomId && roomBusy.has(`${day}:${slotIdx}:${src.roomId}`)) continue;
        return { day, slotIdx };
      }
    }
    return null;
  }

  private async materialize(
    quarter: Quarter,
    classId: string,
    quarterId: string,
    period: { id: string },
    weekday: number,
    src: { subjectId: string; teacherId?: string | null; roomId?: string | null },
    courseId?: string,
  ): Promise<number> {
    const dates = this.enumerateDates(quarter.startDate, quarter.endDate, weekday);
    if (!dates.length) return 0;
    const existing = await this.lessons.find({
      where: { classId, lessonPeriodId: period.id, lessonDate: In(dates) },
      select: { lessonDate: true },
    });
    const taken = new Set(existing.map((l) => l.lessonDate));
    const rows = dates
      .filter((d) => !taken.has(d))
      .map((lessonDate) =>
        this.lessons.create({
          classId,
          quarterId,
          subjectId: src.subjectId,
          teacherId: src.teacherId ?? null,
          roomId: src.roomId ?? null,
          courseId: courseId ?? null,
          lessonPeriodId: period.id,
          lessonDate,
          weekday,
          status: LessonStatus.PLANNED,
        }),
      );
    if (rows.length) await this.lessons.save(rows);
    return rows.length;
  }

  private async describeDistribution(dto: GenerateScheduleDto, academicYearId: string) {
    const classIds = Array.from(new Set(dto.distribution.map((d) => d.classId)));
    const subjectIds = Array.from(new Set(dto.distribution.map((d) => d.subjectId)));
    const teacherIds = dto.distribution.map((d) => d.teacherId).filter((x): x is string => !!x);
    const classes = classIds.length ? await this.classes.find({ where: tenantWhere<SchoolClass>(this.tenant, { id: In(classIds) }, { branch: true }) }) : [];
    const subjects = subjectIds.length ? await this.subjects.find({ where: { id: In(subjectIds) } }) : [];
    const teachers = teacherIds.length
      ? await this.hrTeachers.find({
          where: tenantWhere<Teacher>(this.tenant, { id: In(teacherIds) }, { branch: true }),
          relations: { staffMember: true },
        })
      : [];
    const classMap = new Map(classes.map((c) => [c.id, c.name] as const));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name] as const));
    const teacherMap = new Map(teachers.map((t) => [t.id, this.teacherFullName(t)] as const));
    const existing = await this.lessons.find({
      where: { quarterId: dto.quarterId, classId: In(classIds.length ? classIds : ['']) },
      select: { classId: true, subjectId: true },
    });
    const existingKeys = new Set(existing.map((l) => `${l.classId}:${l.subjectId}`));
    void academicYearId;
    return dto.distribution.map((d) => ({
      classId: d.classId,
      className: classMap.get(d.classId) ?? null,
      subjectId: d.subjectId,
      subjectName: subjectMap.get(d.subjectId) ?? null,
      teacherId: d.teacherId ?? null,
      teacherName: d.teacherId ? teacherMap.get(d.teacherId) ?? null : null,
      hoursPerWeek: d.hoursPerWeek,
      status: existingKeys.has(`${d.classId}:${d.subjectId}`) ? ('update' as const) : ('add' as const),
    }));
  }

  private fullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
  }

  /** HR o'qituvchi ismi — shaxsiy ma'lumot yagona manbasi StaffMember. */
  private teacherFullName(teacher: Teacher): string {
    const sm = teacher.staffMember;
    return sm ? [sm.lastName, sm.firstName].filter(Boolean).join(' ').trim() : '';
  }

  /** User id → shu foydalanuvchiga bog'langan xodimning HR o'qituvchi id'si (bo'lmasa null). */
  private async hrTeacherIdByUserId(userId: string | null | undefined): Promise<string | null> {
    if (!userId) return null;
    const teacher = await this.hrTeachers.findOne({
      where: tenantWhere<Teacher>(this.tenant, { staffMember: { userId } }, { branch: true }),
    });
    return teacher?.id ?? null;
  }

  /** Bugungi sana (YYYY-MM-DD). Testlarda override qilinadi. */
  protected currentDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private maxDate(a: string, b: string): string {
    return a >= b ? a : b;
  }

  /** Berilgan sana tegishli haftaning dushanbasi (YYYY-MM-DD). */
  private mondayOf(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (iso - 1));
    return d.toISOString().slice(0, 10);
  }

  /** [start, end] oralig'ini haftalarga bo'ladi: har biri dushanba–yakshanba. */
  private enumerateWeeks(start: string, end: string): { weekNumber: number; startDate: string; endDate: string }[] {
    const weeks: { weekNumber: number; startDate: string; endDate: string }[] = [];
    const cursor = new Date(`${this.mondayOf(start)}T00:00:00Z`);
    const endD = new Date(`${end}T00:00:00Z`);
    let n = 1;
    while (cursor <= endD) {
      const monday = cursor.toISOString().slice(0, 10);
      const sunday = new Date(cursor);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      weeks.push({ weekNumber: n, startDate: monday, endDate: sunday.toISOString().slice(0, 10) });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      n++;
    }
    return weeks;
  }

  /** [start, end] oralig'idagi berilgan ISO hafta kuniga to'g'ri keladigan barcha sanalar. */
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
    actor: ScheduleActor | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService?.log({
        userId: actor?.userId,
        action,
        entity: 'lesson_schedule',
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write lesson_schedule audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
