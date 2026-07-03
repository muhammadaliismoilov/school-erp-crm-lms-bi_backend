import type { Repository } from 'typeorm';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { Exam } from '../src/modules/lms/entities/exam.entity';
import type { ExamResult } from '../src/modules/lms/entities/exam-result.entity';
import type { QuarterSubjectGrade } from '../src/modules/lms/entities/quarter-subject-grade.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { ProgressReportsService } from '../src/modules/progress-reports/progress-reports.service';

function qb<T>(rows: T[]) {
  const o: Record<string, unknown> = {};
  for (const m of ['leftJoinAndSelect', 'innerJoinAndSelect', 'where', 'andWhere', 'orderBy']) o[m] = () => o;
  o.getMany = async () => rows;
  return o;
}

const CLASS = 'class-0000-0000-0000-000000000000';

function student(id: string, lastName: string, firstName: string): Student {
  return { id, firstName, lastName } as unknown as Student;
}

function grade(studentId: string, subjectId: string, quarterId: string, value: number, name: string): QuarterSubjectGrade {
  return {
    studentId,
    subjectId,
    quarterId,
    grade: value,
    subject: { id: subjectId, name: { uz: name }, color: '#111111' },
    quarter: { id: quarterId, quarterNumber: quarterId === 'q1' ? 1 : 2 },
  } as unknown as QuarterSubjectGrade;
}

describe('ProgressReportsService', () => {
  let students: { find: jest.Mock };
  let quarterGrades: { createQueryBuilder: jest.Mock };
  let exams: Record<string, jest.Mock>;
  let examResults: { createQueryBuilder: jest.Mock };
  let subjects: Record<string, jest.Mock>;
  let quarters: Record<string, jest.Mock>;
  let service: ProgressReportsService;

  beforeEach(() => {
    students = { find: jest.fn() };
    quarterGrades = { createQueryBuilder: jest.fn(() => qb<QuarterSubjectGrade>([])) };
    exams = {};
    examResults = { createQueryBuilder: jest.fn(() => qb<ExamResult>([])) };
    subjects = {};
    quarters = {};
    service = new ProgressReportsService(
      students as unknown as Repository<Student>,
      quarterGrades as unknown as Repository<QuarterSubjectGrade>,
      exams as unknown as Repository<Exam>,
      examResults as unknown as Repository<ExamResult>,
      subjects as unknown as Repository<Subject>,
      quarters as unknown as Repository<Quarter>,
      null as never,
    );
  });

  describe('getAverageReport', () => {
    it('classId berilmasa barcha aktiv o‘quvchilarni so‘raydi', async () => {
      students.find.mockResolvedValue([]);
      const res = await service.getAverageReport({ page: 1, limit: 20 });
      // classId where shartisiz, faqat status bo'yicha — "Barcha sinflar"
      expect(students.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ currentClassId: expect.anything() }) }),
      );
      expect(res.rows).toEqual([]);
      expect(res.stats.jamiOquvchilar).toBe(0);
    });

    it('matritsa, o‘rtachalar, footer va statni hisoblaydi', async () => {
      const s1 = student('s1', 'Aliyev', 'Aziz');
      const s2 = student('s2', 'Rahimova', 'Barno');
      students.find.mockResolvedValue([s1, s2]);
      quarterGrades.createQueryBuilder.mockReturnValue(
        qb<QuarterSubjectGrade>([
          grade('s1', 'm', 'q1', 5, 'Matematika'),
          grade('s1', 'p', 'q1', 4, 'Fizika'),
          grade('s2', 'm', 'q1', 4, 'Matematika'),
          grade('s2', 'p', 'q1', 3, 'Fizika'),
        ]),
      );

      const res = await service.getAverageReport({ classId: CLASS, quarterId: 'q1', page: 1, limit: 20 });

      // Fanlar nom bo'yicha tartiblanadi: Fizika, Matematika
      expect(res.subjects.map((s) => s.name)).toEqual(['Fizika', 'Matematika']);
      expect(res.rows[0]).toMatchObject({ student: { name: 'Aliyev Aziz' }, average: 4.5 });
      expect(res.rows[0].grades).toEqual({ p: 4, m: 5 });
      expect(res.rows[1]).toMatchObject({ student: { name: 'Rahimova Barno' }, average: 3.5 });
      expect(res.footer).toEqual({ subjectAverages: { p: 3.5, m: 4.5 }, overall: 4 });
      expect(res.stats).toMatchObject({
        jamiOquvchilar: 2,
        ortachaBaho: 4,
        alochilar: 1,
        alochilarPercent: 50,
        yaxshi: 1,
        yaxshiPercent: 50,
        qoniqarsiz: 0,
        qoniqarsizPercent: 0,
      });
    });

    it('qoniqarsiz va a‘lochi kategoriyalarini ajratadi', async () => {
      const s1 = student('s1', 'A', 'A');
      const s2 = student('s2', 'B', 'B');
      students.find.mockResolvedValue([s1, s2]);
      quarterGrades.createQueryBuilder.mockReturnValue(
        qb<QuarterSubjectGrade>([
          grade('s1', 'm', 'q1', 5, 'Matematika'), // avg 5 → a'lochi
          grade('s2', 'm', 'q1', 2, 'Matematika'), // avg 2 → qoniqarsiz
        ]),
      );
      const res = await service.getAverageReport({ classId: CLASS, quarterId: 'q1', page: 1, limit: 20 });
      expect(res.stats).toMatchObject({ alochilar: 1, qoniqarsiz: 1, yaxshi: 0 });
    });

    it('paginationni qo‘llaydi', async () => {
      const list = Array.from({ length: 12 }, (_, i) => student(`s${i}`, `L${i}`, `F${i}`));
      students.find.mockResolvedValue(list);
      quarterGrades.createQueryBuilder.mockReturnValue(
        qb<QuarterSubjectGrade>(list.map((s) => grade(s.id, 'm', 'q1', 4, 'Matematika'))),
      );
      const res = await service.getAverageReport({ classId: CLASS, quarterId: 'q1', page: 2, limit: 10 });
      expect(res.meta).toEqual({ page: 2, limit: 10, total: 12, pageCount: 2 });
      expect(res.rows).toHaveLength(2);
    });
  });

  describe('getQuarterlyReport', () => {
    it('fan × chorak hujayralarini quradi', async () => {
      const s1 = student('s1', 'Aliyev', 'Aziz');
      students.find.mockResolvedValue([s1]);
      quarterGrades.createQueryBuilder.mockReturnValue(
        qb<QuarterSubjectGrade>([
          grade('s1', 'm', 'q1', 5, 'Matematika'),
          grade('s1', 'm', 'q2', 4, 'Matematika'),
        ]),
      );
      const res = await service.getQuarterlyReport({ classId: CLASS, page: 1, limit: 20 });
      expect(res.subjects).toHaveLength(1);
      expect(res.quarters.map((q) => q.quarterNumber)).toEqual([1, 2]);
      expect(res.rows[0].cells.m).toEqual({ q1: 5, q2: 4 });
      expect(res.rows[0].average).toBe(4.5);
    });
  });

  describe('getProgressExamReport', () => {
    it('o‘rtacha baho va ballni imtihon natijalaridan hisoblaydi', async () => {
      const s1 = student('s1', 'Aliyev', 'Aziz');
      const s2 = student('s2', 'Barno', 'Rahimova');
      students.find.mockResolvedValue([s1, s2]);
      examResults.createQueryBuilder.mockReturnValue(
        qb<ExamResult>([
          { studentId: 's1', score: 80, exam: { maxScore: 100 } } as unknown as ExamResult,
          { studentId: 's1', score: 90, exam: { maxScore: 100 } } as unknown as ExamResult,
        ]),
      );
      const res = await service.getProgressExamReport({ classId: CLASS, page: 1, limit: 20 });
      expect(res.rows[0]).toMatchObject({ avgBall: 85, avgBaho: 4.3 });
      expect(res.rows[1]).toMatchObject({ avgBall: null, avgBaho: null });
      expect(res.stats).toMatchObject({ jamiOquvchilar: 2, sinfOrtachaBall: 85, sinfOrtachaBaho: 4.3 });
    });

    it('classId yo‘q bo‘lsa barcha o‘quvchilardan hisoblaydi (o‘quvchi yo‘q → bo‘sh)', async () => {
      students.find.mockResolvedValue([]);
      const res = await service.getProgressExamReport({ page: 1, limit: 20 });
      expect(res.rows).toEqual([]);
      expect(res.stats.jamiOquvchilar).toBe(0);
    });
  });
});
