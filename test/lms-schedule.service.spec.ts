import type { Repository } from 'typeorm';
import { ScheduleService } from '../src/modules/lms/schedule.service';
import { ScheduleGenerateMode } from '../src/modules/lms/dto/schedule.dto';
import type { LessonSchedule } from '../src/modules/lms/entities/lesson-schedule.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Course } from '../src/modules/academic/entities/course.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { User } from '../src/modules/identity/entities/user.entity';

type AnyRepo = Record<string, jest.Mock>;

const quarter = (over: Partial<Quarter> = {}): Quarter =>
  ({
    id: 'Q1',
    academicYearId: 'AY1',
    startDate: '2026-06-01', // Dushanba
    endDate: '2026-06-14', // Yakshanba (ikki hafta)
    ...over,
  }) as unknown as Quarter;

const period = (id: string, order: number): LessonPeriod =>
  ({ id, code: String(order), startTime: '08:00', endTime: '08:45', order }) as unknown as LessonPeriod;

const makeRepos = (over: { lessons?: Partial<AnyRepo> } = {}) => {
  const saved: LessonSchedule[][] = [];
  const lessons: AnyRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: unknown) => x as LessonSchedule),
    save: jest.fn(async (rows: LessonSchedule[]) => {
      saved.push(Array.isArray(rows) ? rows : [rows]);
      return rows;
    }),
    update: jest.fn().mockResolvedValue({ affected: 3 }),
    softDelete: jest.fn().mockResolvedValue({ affected: 4 }),
    ...over.lessons,
  };
  const classes: AnyRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
  const quarters: AnyRepo = { findOne: jest.fn().mockResolvedValue(quarter()) };
  const periods: AnyRepo = {
    find: jest.fn().mockResolvedValue([period('P1', 1), period('P2', 2), period('P3', 3)]),
  };
  const courses: AnyRepo = { findOne: jest.fn() };
  const subjects: AnyRepo = { find: jest.fn().mockResolvedValue([]) };
  const users: AnyRepo = { find: jest.fn().mockResolvedValue([]) };

  const service = new ScheduleService(
    lessons as unknown as Repository<LessonSchedule>,
    classes as unknown as Repository<SchoolClass>,
    quarters as unknown as Repository<Quarter>,
    periods as unknown as Repository<LessonPeriod>,
    courses as unknown as Repository<Course>,
    subjects as unknown as Repository<Subject>,
    users as unknown as Repository<User>,
  );
  return { service, lessons, classes, quarters, periods, courses, subjects, users, saved };
};

describe('ScheduleService.createCell', () => {
  it('chorak boshidan barcha mos hafta kunlariga dars yaratadi', async () => {
    const { service, saved } = makeRepos();
    const result = await service.createCell({
      quarterId: 'Q1',
      classId: 'C1',
      lessonPeriodId: 'P1',
      weekday: 1, // Dushanba: 2026-06-01, 2026-06-08
      subjectId: 'S1',
    });
    expect(result.created).toBe(2);
    const rows = saved.flat();
    expect(rows.map((r) => r.lessonDate).sort()).toEqual(['2026-06-01', '2026-06-08']);
    expect(rows.every((r) => r.weekday === 1 && r.subjectId === 'S1')).toBe(true);
  });

  it('fromToday yoqilganda faqat bugundan keyingi sanalarni yaratadi', async () => {
    const { service } = makeRepos();
    jest.spyOn(service as unknown as { currentDate: () => string }, 'currentDate').mockReturnValue('2026-06-08');
    const result = await service.createCell({
      quarterId: 'Q1',
      classId: 'C1',
      lessonPeriodId: 'P1',
      weekday: 1,
      subjectId: 'S1',
      fromToday: true,
    });
    expect(result.created).toBe(1);
  });

  it('subjectId ham courseId ham bo‘lmasa xato beradi', async () => {
    const { service } = makeRepos();
    await expect(
      service.createCell({ quarterId: 'Q1', classId: 'C1', lessonPeriodId: 'P1', weekday: 1 }),
    ).rejects.toThrow();
  });
});

describe('ScheduleService.updateCell / deleteCell', () => {
  const rep = {
    id: 'L1',
    classId: 'C1',
    lessonPeriodId: 'P1',
    weekday: 1,
    quarterId: 'Q1',
    subjectId: 'S1',
  } as unknown as LessonSchedule;

  it('katakni yangilaydi (faqat bugun va kelgusi darslar)', async () => {
    const { service, lessons } = makeRepos({ lessons: { findOne: jest.fn().mockResolvedValue(rep) } });
    const result = await service.updateCell('L1', { teacherId: 'T9' });
    expect(result.updated).toBe(3);
    const [where, patch] = lessons.update.mock.calls[0];
    expect(where.classId).toBe('C1');
    expect(where.lessonDate).toBeDefined(); // MoreThanOrEqual(today)
    expect(patch.teacherId).toBe('T9');
  });

  it('katakni o‘chiradi (soft delete, faqat aktiv kelgusi darslar)', async () => {
    const { service, lessons } = makeRepos({ lessons: { findOne: jest.fn().mockResolvedValue(rep) } });
    const result = await service.deleteCell('L1');
    expect(result.deleted).toBe(4);
    const [where] = lessons.softDelete.mock.calls[0];
    expect(where.classId).toBe('C1');
    // Allaqachon o'chirilgan qatorlarni qayta belgilamaslik uchun deletedAt: IsNull().
    expect(where.deletedAt).toBeDefined();
  });
});

describe('ScheduleService.substitute', () => {
  it('kelgusi darslarda o‘qituvchini almashtiradi va asl o‘qituvchini saqlaydi', async () => {
    const upcoming = [
      { id: 'a', teacherId: 'T1', originalTeacherId: null },
      { id: 'b', teacherId: 'T1', originalTeacherId: null },
    ] as unknown as LessonSchedule[];
    const { service, saved } = makeRepos({ lessons: { find: jest.fn().mockResolvedValue(upcoming) } });
    const result = await service.substitute({
      quarterId: 'Q1',
      classId: 'C1',
      subjectId: 'S1',
      lessonPeriodId: 'P1',
      weekday: 1,
      substituteTeacherId: 'T2',
      count: 2,
    });
    expect(result.substituted).toBe(2);
    const rows = saved.flat();
    expect(rows.every((r) => r.teacherId === 'T2' && r.originalTeacherId === 'T1')).toBe(true);
  });
});

describe('ScheduleService.preview', () => {
  const base = {
    quarterId: 'Q1',
    mode: ScheduleGenerateMode.ADD,
    days: [1, 2, 3, 4, 5],
    maxPerDay: 7,
    maxPerSubjectPerDay: 2,
  };

  it('bo‘sh taqsimotni rad etadi', async () => {
    const { service } = makeRepos();
    const res = await service.preview({ ...base, distribution: [] });
    expect(res.valid).toBe(false);
    expect(res.message).toContain("To'liq fan taqsimoti yo'q");
  });

  it('haftalik soat maksimumdan oshsa rad etadi', async () => {
    const { service } = makeRepos();
    const res = await service.preview({
      ...base,
      distribution: [{ classId: 'C1', subjectId: 'S1', hoursPerWeek: 40 }],
    });
    expect(res.valid).toBe(false);
  });

  it('to‘g‘ri taqsimotni qabul qiladi va add/update ni hisoblaydi', async () => {
    const { service } = makeRepos();
    const res = await service.preview({
      ...base,
      distribution: [{ classId: 'C1', subjectId: 'S1', teacherId: 'T1', hoursPerWeek: 3 }],
    });
    expect(res.valid).toBe(true);
    expect(res.toCreate).toBe(1);
    expect(res.toUpdate).toBe(0);
  });
});

describe('ScheduleService.generate', () => {
  it('o‘qituvchi band bo‘lganda boshqa sinfga slot topa olmaydi (skip)', async () => {
    const { service } = makeRepos();
    const res = await service.generate({
      quarterId: 'Q1',
      mode: ScheduleGenerateMode.ADD,
      days: [1], // faqat Dushanba
      maxPerDay: 2, // 2 slot
      maxPerSubjectPerDay: 2,
      distribution: [
        { classId: 'C1', subjectId: 'S1', teacherId: 'T1', hoursPerWeek: 2 }, // T1 ni ikkala slotda band qiladi
        { classId: 'C2', subjectId: 'S2', teacherId: 'T1', hoursPerWeek: 1 }, // T1 band — joy yo'q
      ],
    });
    expect(res.created).toBeGreaterThan(0);
    expect(res.skipped).toBe(1);
    expect(res.conflicts).toEqual([{ classId: 'C2', subjectId: 'S2', reason: 'no_slot' }]);
  });

  it('maxPerDay cheklovini hurmat qiladi', async () => {
    const { service } = makeRepos();
    const res = await service.generate({
      quarterId: 'Q1',
      mode: ScheduleGenerateMode.ADD,
      days: [1],
      maxPerDay: 1, // kuniga 1 dars
      maxPerSubjectPerDay: 5,
      distribution: [{ classId: 'C1', subjectId: 'S1', teacherId: 'T1', hoursPerWeek: 2 }],
    });
    expect(res.skipped).toBe(1); // 2 ta kerak, 1 ta joy
  });

  it('refresh rejimida avval kelgusi darslarni tozalaydi', async () => {
    const { service, lessons } = makeRepos();
    const res = await service.generate({
      quarterId: 'Q1',
      mode: ScheduleGenerateMode.REFRESH,
      days: [1],
      maxPerDay: 2,
      maxPerSubjectPerDay: 2,
      distribution: [{ classId: 'C1', subjectId: 'S1', teacherId: 'T1', hoursPerWeek: 1 }],
    });
    expect(lessons.softDelete).toHaveBeenCalled();
    expect(res.updated).toBe(4);
  });
});

describe('ScheduleService.getConflicts', () => {
  it('bir o‘qituvchi bir vaqtda ikki sinfda bo‘lsa ziddiyat aniqlaydi', async () => {
    const conflicting = [
      { classId: 'C1', subjectId: 'S1', teacherId: 'T1', roomId: 'R1', weekday: 1, lessonPeriodId: 'P1', lessonDate: '2026-06-01', class: { name: '1-A' }, teacher: { firstName: 'A', lastName: 'B' }, lessonPeriod: { code: '1' } },
      { classId: 'C2', subjectId: 'S2', teacherId: 'T1', roomId: 'R2', weekday: 1, lessonPeriodId: 'P1', lessonDate: '2026-06-01', class: { name: '1-B' }, teacher: { firstName: 'A', lastName: 'B' }, lessonPeriod: { code: '1' } },
    ] as unknown as LessonSchedule[];
    const { service } = makeRepos({ lessons: { find: jest.fn().mockResolvedValue(conflicting) } });
    const res = await service.getConflicts('Q1');
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.conflicts.some((c) => c.type === 'teacher')).toBe(true);
  });
});
