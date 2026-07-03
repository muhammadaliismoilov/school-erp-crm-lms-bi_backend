import type { Repository } from 'typeorm';
import { AttendanceStatus } from '../src/common/enums/attendance-status.enum';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { AttendanceRecord } from '../src/modules/attendance/entities/attendance-record.entity';
import type { ExamResult } from '../src/modules/lms/entities/exam-result.entity';
import type { JournalEntry } from '../src/modules/lms/entities/journal-entry.entity';
import type { QuarterSubjectGrade } from '../src/modules/lms/entities/quarter-subject-grade.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { StudentsRatingService } from '../src/modules/students-rating/students-rating.service';

/** Zanjirli (chainable) query builder mock — getMany berilgan qatorlarni qaytaradi. */
function qb<T>(rows: T[]) {
  const o: Record<string, unknown> = {};
  const chain = [
    'leftJoinAndSelect',
    'innerJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
    'skip',
    'take',
    'select',
    'addSelect',
  ];
  for (const m of chain) o[m] = () => o;
  o.getMany = async () => rows;
  o.getManyAndCount = async () => [rows, rows.length];
  return o;
}

const YEAR_ID = 'year-0000-0000-0000-000000000000';
const CLASS_1A = 'class1a-0000-0000-0000-00000000';
const CLASS_1B = 'class1b-0000-0000-0000-00000000';

function student(id: string, lastName: string, firstName: string, classId = CLASS_1A, className = '1A'): Student {
  return {
    id,
    firstName,
    lastName,
    currentClassId: classId,
    currentClass: { id: classId, name: className, academicYearId: YEAR_ID },
  } as unknown as Student;
}

function attendance(studentId: string, present: number, absent: number): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  for (let i = 0; i < present; i++) records.push({ studentId, status: AttendanceStatus.PRESENT } as AttendanceRecord);
  for (let i = 0; i < absent; i++) records.push({ studentId, status: AttendanceStatus.ABSENT } as AttendanceRecord);
  return records;
}

describe('StudentsRatingService', () => {
  let students: { createQueryBuilder: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let academicYears: { findOne: jest.Mock };
  let quarters: Record<string, jest.Mock>;
  let subjects: Record<string, jest.Mock>;
  let quarterGrades: { createQueryBuilder: jest.Mock };
  let journal: { createQueryBuilder: jest.Mock };
  let examResults: { createQueryBuilder: jest.Mock };
  let attendanceRepo: { find: jest.Mock };
  let service: StudentsRatingService;

  beforeEach(() => {
    students = { createQueryBuilder: jest.fn(), find: jest.fn(), findOne: jest.fn() };
    academicYears = { findOne: jest.fn(async () => ({ id: YEAR_ID, isCurrent: true }) as AcademicYear) };
    quarters = {};
    subjects = {};
    quarterGrades = { createQueryBuilder: jest.fn(() => qb<QuarterSubjectGrade>([])) };
    journal = { createQueryBuilder: jest.fn(() => qb<JournalEntry>([])) };
    examResults = { createQueryBuilder: jest.fn(() => qb<ExamResult>([])) };
    attendanceRepo = { find: jest.fn(async () => [] as AttendanceRecord[]) };

    service = new StudentsRatingService(
      students as unknown as Repository<Student>,
      academicYears as unknown as Repository<AcademicYear>,
      quarters as unknown as Repository<Quarter>,
      subjects as unknown as Repository<Subject>,
      quarterGrades as unknown as Repository<QuarterSubjectGrade>,
      journal as unknown as Repository<JournalEntry>,
      examResults as unknown as Repository<ExamResult>,
      attendanceRepo as unknown as Repository<AttendanceRecord>,
      null as never,
    );
  });

  describe('getRating', () => {
    it('davomatdan kompozit umumiy ballni hisoblaydi va kamayish tartibida saralaydi', async () => {
      const s1 = student('s1', 'Abdullayeva', 'Hilola');
      const s2 = student('s2', 'Ergashev', 'Davron');
      students.createQueryBuilder.mockReturnValue(qb([s1, s2]));
      // s1: 19/20 = 95% → round(95/100*25)=24 ; s2: 39/50 = 78% → round(19.5)=20
      attendanceRepo.find.mockResolvedValue([...attendance('s1', 19, 1), ...attendance('s2', 39, 11)]);

      const res = await service.getRating({ page: 1, limit: 20 });

      expect(res.items).toHaveLength(2);
      expect(res.items[0]).toMatchObject({ studentId: 's1', umumiyBall: 24, ortachaBall: 0, davomat: 95, trend: 'stable' });
      expect(res.items[1]).toMatchObject({ studentId: 's2', umumiyBall: 20, davomat: 78 });
      expect(res.items[0].studentName).toBe('Abdullayeva Hilola');
      expect(res.items[0].initials).toBe('AH');
    });

    it('davomat yozuvi bo‘lmasa 100% deb oladi', async () => {
      const s1 = student('s1', 'Qodirova', 'Severa');
      students.createQueryBuilder.mockReturnValue(qb([s1]));
      attendanceRepo.find.mockResolvedValue([]);

      const res = await service.getRating({ page: 1, limit: 20 });
      expect(res.items[0]).toMatchObject({ umumiyBall: 25, davomat: 100 });
    });

    it('baho mavjud bo‘lsa akademik + davomat vaznli hisoblanadi', async () => {
      const s1 = student('s1', 'Karimov', 'Bobur');
      students.createQueryBuilder.mockReturnValue(qb([s1]));
      attendanceRepo.find.mockResolvedValue([]); // 100%
      // grade 5 va 4 → avg 4.5 ; umumiy = round(0.7*22.5 + 0.3*25) = 23 ; ortachaBall = 5
      quarterGrades.createQueryBuilder.mockReturnValue(
        qb<QuarterSubjectGrade>([
          { studentId: 's1', subjectId: 'm', grade: 5, subject: null, quarter: null } as unknown as QuarterSubjectGrade,
          { studentId: 's1', subjectId: 'p', grade: 4, subject: null, quarter: null } as unknown as QuarterSubjectGrade,
        ]),
      );

      const res = await service.getRating({ page: 1, limit: 20 });
      expect(res.items[0]).toMatchObject({ umumiyBall: 23, ortachaBall: 5 });
    });

    it('stat kartalarni va pagination meta’ni qaytaradi', async () => {
      const list = Array.from({ length: 12 }, (_, i) => student(`s${i}`, `L${i}`, `F${i}`));
      students.createQueryBuilder.mockReturnValue(qb(list));
      attendanceRepo.find.mockResolvedValue([]); // hammasi 100% → umumiy 25

      const res = await service.getRating({ page: 2, limit: 10 });
      expect(res.meta).toEqual({ page: 2, limit: 10, total: 12, pageCount: 2 });
      expect(res.items).toHaveLength(2);
      expect(res.stats).toEqual({ jamiOquvchi: 12, ortachaUmumiyBall: 25, osishTrendi: 0 });
    });
  });

  describe('getLeaders', () => {
    it('podiumda 3 ta va ro‘yxatda limit gacha qaytaradi, rank tartiblanadi', async () => {
      const list = Array.from({ length: 15 }, (_, i) => student(`s${i}`, `L${i}`, `F${i}`));
      students.createQueryBuilder.mockReturnValue(qb(list));
      attendanceRepo.find.mockResolvedValue([]);

      const res = await service.getLeaders({ limit: 10 });
      expect(res.podium).toHaveLength(3);
      expect(res.leaders).toHaveLength(10);
      expect(res.leaders[0].rank).toBe(1);
      expect(res.leaders[9].rank).toBe(10);
    });
  });

  describe('getClassAverages', () => {
    it('har bir sinf bo‘yicha o‘rtacha umumiy ballni guruhlaydi', async () => {
      const a = student('a', 'A', 'A', CLASS_1A, '1A');
      const b = student('b', 'B', 'B', CLASS_1A, '1A');
      const c = student('c', 'C', 'C', CLASS_1B, '1B');
      students.createQueryBuilder.mockReturnValue(qb([a, b, c]));
      attendanceRepo.find.mockResolvedValue([]); // hammasi 100 → umumiy 25

      const res = await service.getClassAverages({});
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({ classLabel: '1A', avgUmumiyBall: 25, studentCount: 2 });
    });
  });

  describe('getSubjectAverages', () => {
    it('fan bo‘yicha o‘rtacha choraklik bahoni hisoblaydi', async () => {
      const a = student('a', 'A', 'A');
      students.createQueryBuilder.mockReturnValue(qb([a]));
      quarterGrades.createQueryBuilder.mockReturnValue(
        qb<QuarterSubjectGrade>([
          { studentId: 'a', subjectId: 'm', grade: 5, subject: { name: { uz: 'Matematika' } }, quarter: null } as unknown as QuarterSubjectGrade,
          { studentId: 'a', subjectId: 'm', grade: 4, subject: { name: { uz: 'Matematika' } }, quarter: null } as unknown as QuarterSubjectGrade,
        ]),
      );

      const res = await service.getSubjectAverages({});
      expect(res).toEqual([{ subjectId: 'm', subjectName: 'Matematika', avgBall: 4.5, gradeCount: 2 }]);
    });

    it('o‘quvchi bo‘lmasa bo‘sh massiv qaytaradi', async () => {
      students.createQueryBuilder.mockReturnValue(qb([]));
      const res = await service.getSubjectAverages({});
      expect(res).toEqual([]);
    });
  });

  describe('getStudentDetail', () => {
    it('topilmagan o‘quvchi uchun NotFound tashlaydi', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(service.getStudentDetail('missing')).rejects.toThrow('O‘quvchi topilmadi');
    });

    it('o‘rin, daraja va seriyalarni qaytaradi', async () => {
      const self = student('self', 'Qodirova', 'Severa');
      const other = student('other', 'Aliyev', 'Aziz');
      students.findOne.mockResolvedValue(self);
      students.find.mockResolvedValue([self, other]);
      // self davomat 100 (umumiy 25) > other davomat 80 (umumiy 20) → self rank 1
      attendanceRepo.find.mockImplementation(async () => [...attendance('other', 8, 2)]);

      const res = await service.getStudentDetail('self');
      expect(res).toMatchObject({
        studentId: 'self',
        studentName: 'Qodirova Severa',
        initials: 'QS',
        rank: 1,
        level: 'A’lo',
        umumiyBall: 25,
        davomat: 100,
        ortachaBall: 0,
        trend: 'stable',
      });
      expect(Array.isArray(res.darsBaholariOylik)).toBe(true);
      expect(Array.isArray(res.progressTest)).toBe(true);
    });

    it('jurnal baholari o‘sayotgan bo‘lsa trend rising bo‘ladi', async () => {
      const self = student('self', 'Test', 'User');
      students.findOne.mockResolvedValue(self);
      students.find.mockResolvedValue([self]);
      attendanceRepo.find.mockResolvedValue([]);
      journal.createQueryBuilder.mockReturnValue(
        qb<JournalEntry>([
          { studentId: 'self', grade: 3, lesson: { lessonDate: '2025-09-10' } } as unknown as JournalEntry,
          { studentId: 'self', grade: 5, lesson: { lessonDate: '2025-10-10' } } as unknown as JournalEntry,
        ]),
      );

      const res = await service.getStudentDetail('self');
      expect(res.trend).toBe('rising');
      expect(res.darsBaholariOylik).toEqual([
        { key: '2025-09', label: 'Sen', value: 3 },
        { key: '2025-10', label: 'Okt', value: 5 },
      ]);
    });
  });
});
