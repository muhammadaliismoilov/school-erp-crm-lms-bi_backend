import type { Repository } from 'typeorm';
import { GradebookService } from '../src/modules/lms/gradebook.service';
import type { GamificationService } from '../src/modules/gamification/gamification.service';
import { AttendanceStatus } from '../src/common/enums/attendance-status.enum';
import { WalletTransactionType } from '../src/modules/gamification/enums/gamification.enums';
import type { LessonSchedule } from '../src/modules/lms/entities/lesson-schedule.entity';
import type { JournalEntry } from '../src/modules/lms/entities/journal-entry.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { QuarterSubjectGrade } from '../src/modules/lms/entities/quarter-subject-grade.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';

type AnyRepo = Record<string, jest.Mock>;

const quarter = { id: 'Q1', startDate: '2026-09-01', endDate: '2026-09-30' } as unknown as Quarter;

const make = (over: { lessons?: Partial<AnyRepo>; journal?: Partial<AnyRepo>; students?: Partial<AnyRepo>; quarterGrades?: Partial<AnyRepo>; subjects?: Partial<AnyRepo> } = {}) => {
  const saved: Array<Array<LessonSchedule>> = [];
  const lessons: AnyRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue({ id: 'L1' }), create: jest.fn((x) => x), save: jest.fn(async (r) => { saved.push(r as LessonSchedule[]); return r; }), ...over.lessons };
  const journal: AnyRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), create: jest.fn((x) => x), save: jest.fn(async (r) => r), ...over.journal };
  const students: AnyRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue({ id: 'S1', firstName: 'B', lastName: 'A' }), ...over.students };
  const quarters: AnyRepo = { findOne: jest.fn().mockResolvedValue(quarter) };
  const quarterGrades: AnyRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), create: jest.fn((x) => x), save: jest.fn(async (r) => r), ...over.quarterGrades };
  const subjects: AnyRepo = { find: jest.fn().mockResolvedValue([]), ...over.subjects };
  const periods: AnyRepo = { find: jest.fn().mockResolvedValue([]) };
  const gamification = { findCoinPresets: jest.fn().mockResolvedValue([]), addTransaction: jest.fn().mockResolvedValue({ id: 'tx' }) };

  const service = new GradebookService(
    lessons as unknown as Repository<LessonSchedule>,
    journal as unknown as Repository<JournalEntry>,
    students as unknown as Repository<Student>,
    quarters as unknown as Repository<Quarter>,
    quarterGrades as unknown as Repository<QuarterSubjectGrade>,
    subjects as unknown as Repository<Subject>,
    periods as unknown as Repository<LessonPeriod>,
    gamification as unknown as GamificationService,
    { getSchoolId: () => null, getBranchId: () => null } as unknown as import('../src/common/tenant/tenant-context.service').TenantContextService,
  );
  return { service, lessons, journal, students, quarterGrades, gamification, saved };
};

describe('GradebookService.getGradebook', () => {
  it('katak ball/davomatini, choraklik bahoni va statsni hisoblaydi', async () => {
    const { service } = make({
      lessons: { find: jest.fn().mockResolvedValue([{ id: 'L1', lessonDate: '2026-09-07', topic: null, status: 'planned', subjectId: 'SUB1' }]) },
      students: { find: jest.fn().mockResolvedValue([{ id: 'S1', firstName: 'B', lastName: 'A', studentCode: '001' }]) },
      journal: { find: jest.fn().mockResolvedValue([{ lessonId: 'L1', studentId: 'S1', grade: 5, ball: 90, attendance: AttendanceStatus.PRESENT, homeworkDone: false, comment: null }]) },
      quarterGrades: { find: jest.fn().mockResolvedValue([{ studentId: 'S1', grade: 5, ball: 88, comment: 'zo‘r' }]) },
    });
    const res = await service.getGradebook({ classId: 'C1', subjectId: 'SUB1', quarterId: 'Q1' });
    expect(res.cells[0]).toMatchObject({ ball: 90, attendance: AttendanceStatus.PRESENT });
    expect(res.students[0]).toMatchObject({ average: 5, quarterGrade: 5, quarterBall: 88, attendancePct: 100 });
    expect(res.stats).toMatchObject({ studentCount: 1, lessonCount: 1, averageGrade: 5, excellentCount: 1, attendancePct: 100 });
  });
});

describe('GradebookService.upsertGrade', () => {
  it('ball va davomatni saqlaydi', async () => {
    const { service, journal } = make();
    await service.upsertGrade({ lessonId: 'L1', studentId: 'S1', ball: 75, attendance: AttendanceStatus.LATE });
    const saved = journal.save.mock.calls[0][0];
    expect(saved).toMatchObject({ ball: 75, attendance: AttendanceStatus.LATE });
  });
});

describe('GradebookService.setQuarterGrade', () => {
  it('choraklik bahoni upsert qiladi', async () => {
    const { service, quarterGrades } = make();
    await service.setQuarterGrade({ studentId: 'S1', subjectId: 'SUB1', quarterId: 'Q1', grade: 4, ball: 80, comment: 'ok' });
    expect(quarterGrades.save).toHaveBeenCalled();
    expect(quarterGrades.save.mock.calls[0][0]).toMatchObject({ grade: 4, ball: 80 });
  });
});

describe('GradebookService.generateLessons', () => {
  it('jadvaldagi haftalik slotlardan yetishmaydigan sanalarni yaratadi', async () => {
    // Bitta Dushanba (09-07) mavjud; sentabr dushanbalari: 7,14,21,28 → 3 yangi.
    const { service, saved } = make({
      lessons: { find: jest.fn().mockResolvedValue([{ id: 'L1', lessonDate: '2026-09-07', weekday: 1, lessonPeriodId: 'P1', teacherId: 'T1', roomId: null }]) },
    });
    const res = await service.generateLessons({ classId: 'C1', subjectId: 'SUB1', quarterId: 'Q1' });
    expect(res.created).toBe(3);
    expect(saved.flat().map((r) => r.lessonDate).sort()).toEqual(['2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('jadval bo‘lmasa xato beradi', async () => {
    const { service } = make({ lessons: { find: jest.fn().mockResolvedValue([]) } });
    await expect(service.generateLessons({ classId: 'C1', subjectId: 'SUB1', quarterId: 'Q1' })).rejects.toThrow();
  });
});

describe('GradebookService.getStudentProgress', () => {
  it('GPA va fan bo‘yicha o‘rtacha/davomatni hisoblaydi', async () => {
    const { service } = make({
      lessons: { find: jest.fn().mockResolvedValue([{ id: 'L1', subjectId: 'SUB1' }, { id: 'L2', subjectId: 'SUB2' }]) },
      journal: { find: jest.fn().mockResolvedValue([{ lessonId: 'L1', grade: 5, attendance: AttendanceStatus.PRESENT }, { lessonId: 'L2', grade: 3, attendance: AttendanceStatus.ABSENT }]) },
      subjects: { find: jest.fn().mockResolvedValue([{ id: 'SUB1', name: { uz: 'Mat' } }, { id: 'SUB2', name: { uz: 'Fiz' } }]) },
    });
    const res = await service.getStudentProgress('S1');
    expect(res.gpa).toBe(4);
    expect(res.subjects).toHaveLength(2);
    expect(res.bestSubject?.average).toBe(5);
    expect(res.worstSubject?.average).toBe(3);
  });
});

describe('GradebookService.awardCoin', () => {
  it('gamification ga sourceType=journal bilan yozadi', async () => {
    const { service, gamification } = make();
    await service.awardCoin({ studentId: 'S1', type: WalletTransactionType.EARN, amount: 1000, reason: 'Mehnat', lessonId: 'L1' });
    expect(gamification.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'S1', type: WalletTransactionType.EARN, amount: 1000, sourceType: 'journal', sourceId: 'L1' }),
    );
  });
});
