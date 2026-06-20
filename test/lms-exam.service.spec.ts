import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ExamService } from '../src/modules/lms/exam.service';
import type { Exam } from '../src/modules/lms/entities/exam.entity';
import { ExamKind, ExamStatus, ExamType } from '../src/modules/lms/enums/lms.enums';
import type { LessonSchedule } from '../src/modules/lms/entities/lesson-schedule.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { Course } from '../src/modules/academic/entities/course.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { User } from '../src/modules/identity/entities/user.entity';

type AnyRepo = Record<string, jest.Mock>;

const CLASS_ID = '11111111-1111-1111-1111-111111111111';
const SUBJECT_ID = '22222222-2222-2222-2222-222222222222';
const TEACHER_ID = '33333333-3333-3333-3333-333333333333';
const QUARTER_ID = '44444444-4444-4444-4444-444444444444';
const COURSE_ID = '55555555-5555-5555-5555-555555555555';
const EXAM_ID = '66666666-6666-6666-6666-666666666666';

const schoolClass = { id: CLASS_ID, name: '2-A', gradeLevel: 2, section: 'A' } as SchoolClass;
const subject = { id: SUBJECT_ID, name: { uz: 'Ingliz tili', ru: 'Англ', en: 'Eng' }, color: '#fff' } as unknown as Subject;
const teacher = { id: TEACHER_ID, firstName: 'Farrux', lastName: 'Xolmatov' } as User;
const quarter = { id: QUARTER_ID, name: { uz: 'I chorak', ru: '1', en: '1' }, quarterNumber: 1 } as unknown as Quarter;
const course = {
  id: COURSE_ID,
  name: 'IT',
  subjectId: SUBJECT_ID,
  teacherId: TEACHER_ID,
  subject,
  teacher,
} as unknown as Course;

const classExamEntity = (over: Partial<Exam> = {}): Exam =>
  ({
    id: EXAM_ID,
    title: 'Ingliz tili — Test (2-A)',
    examKind: ExamKind.CLASS,
    examType: ExamType.TEST,
    classId: CLASS_ID,
    subjectId: SUBJECT_ID,
    teacherId: TEACHER_ID,
    quarterId: QUARTER_ID,
    courseId: null,
    examDate: '2026-06-23',
    availableFrom: null,
    availableUntil: null,
    maxScore: 100,
    status: ExamStatus.DRAFT,
    class: schoolClass,
    subject,
    teacher,
    quarter,
    course: null,
    results: [],
    ...over,
  }) as unknown as Exam;

const makeService = (over: { exams?: Partial<AnyRepo> } = {}) => {
  const saved: Exam[] = [];
  const exams: AnyRepo = {
    create: jest.fn((x: Partial<Exam>) => x as Exam),
    save: jest.fn(async (x: Exam) => {
      const row = { ...x, id: x.id ?? EXAM_ID } as Exam;
      saved.push(row);
      return row;
    }),
    findOne: jest.fn().mockResolvedValue(classExamEntity()),
    findAndCount: jest.fn().mockResolvedValue([[classExamEntity()], 1]),
    find: jest.fn().mockResolvedValue([classExamEntity()]),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    ...over.exams,
  };
  const classes: AnyRepo = { findOne: jest.fn().mockResolvedValue(schoolClass) };
  const subjects: AnyRepo = { findOne: jest.fn().mockResolvedValue(subject), find: jest.fn().mockResolvedValue([subject]) };
  const courses: AnyRepo = { findOne: jest.fn().mockResolvedValue(course), find: jest.fn().mockResolvedValue([course]) };
  const quarters: AnyRepo = { findOne: jest.fn().mockResolvedValue(quarter), find: jest.fn().mockResolvedValue([quarter]) };
  const users: AnyRepo = { findOne: jest.fn().mockResolvedValue(teacher), find: jest.fn().mockResolvedValue([teacher]) };
  const lessons: AnyRepo = { find: jest.fn().mockResolvedValue([]) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new ExamService(
    exams as unknown as Repository<Exam>,
    classes as unknown as Repository<SchoolClass>,
    subjects as unknown as Repository<Subject>,
    courses as unknown as Repository<Course>,
    quarters as unknown as Repository<Quarter>,
    users as unknown as Repository<User>,
    lessons as unknown as Repository<LessonSchedule>,
    audit as never,
  );
  return { service, exams, classes, subjects, courses, quarters, users, lessons, audit, saved };
};

describe('ExamService — sinf imtihoni', () => {
  it('sinf imtihonini yaratadi va sarlavhani avtomatik tuzadi', async () => {
    const { service, exams, audit, saved } = makeService();
    const res = await service.createClassExam({
      classId: CLASS_ID,
      subjectId: SUBJECT_ID,
      teacherId: TEACHER_ID,
      quarterId: QUARTER_ID,
      examType: ExamType.TEST,
      examDate: '2026-06-23',
    });
    expect(exams.save).toHaveBeenCalled();
    expect(saved[0].examKind).toBe(ExamKind.CLASS);
    expect(saved[0].title).toContain('Ingliz tili');
    expect(saved[0].status).toBe(ExamStatus.DRAFT);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'exam.class_created' }));
    expect(res.examKind).toBe(ExamKind.CLASS);
    expect(res.teacherName).toBe('Farrux Xolmatov');
  });

  it('sinf topilmasa NotFound tashlaydi', async () => {
    const { service, classes } = makeService();
    classes.findOne.mockResolvedValue(null);
    await expect(
      service.createClassExam({
        classId: CLASS_ID,
        subjectId: SUBJECT_ID,
        teacherId: TEACHER_ID,
        quarterId: QUARTER_ID,
        examType: ExamType.TEST,
        examDate: '2026-06-23',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('vaqt oralig‘i teskari bo‘lsa BadRequest tashlaydi', async () => {
    const { service } = makeService();
    await expect(
      service.createClassExam({
        classId: CLASS_ID,
        subjectId: SUBJECT_ID,
        teacherId: TEACHER_ID,
        quarterId: QUARTER_ID,
        examType: ExamType.TEST,
        examDate: '2026-06-23',
        availableFrom: '2026-06-23T12:00:00.000Z',
        availableUntil: '2026-06-23T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ExamService — kurs imtihoni', () => {
  it('kurs imtihonini yaratadi (fan/o‘qituvchi kursdan olinadi)', async () => {
    const { service, saved } = makeService({
      exams: {
        findOne: jest.fn().mockResolvedValue(
          classExamEntity({ examKind: ExamKind.COURSE, courseId: COURSE_ID, classId: null, subjectId: null, teacherId: null, class: null, subject: null, teacher: null, course } as Partial<Exam>),
        ),
      },
    });
    const res = await service.createCourseExam({
      courseId: COURSE_ID,
      quarterId: QUARTER_ID,
      examType: ExamType.CONTROL_WORK,
      examDate: '2026-06-23',
    });
    expect(saved[0].examKind).toBe(ExamKind.COURSE);
    expect(saved[0].title).toContain('IT');
    expect(res.examKind).toBe(ExamKind.COURSE);
    expect(res.courseName).toBe('IT');
    expect(res.subjectName).toEqual(subject.name);
  });

  it('kurs topilmasa NotFound', async () => {
    const { service, courses } = makeService();
    courses.findOne.mockResolvedValue(null);
    await expect(
      service.createCourseExam({ courseId: COURSE_ID, quarterId: QUARTER_ID, examType: ExamType.TEST, examDate: '2026-06-23' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ExamService — ro‘yxat va statistika', () => {
  it('items + stats + pagination qaytaradi', async () => {
    const { service, exams } = makeService({
      exams: {
        findAndCount: jest.fn().mockResolvedValue([[classExamEntity(), classExamEntity({ id: 'x', status: ExamStatus.FINISHED, results: [{ id: 'r' }] } as Partial<Exam>)], 2]),
        find: jest.fn().mockResolvedValue([
          classExamEntity(),
          classExamEntity({ status: ExamStatus.FINISHED, results: [{ id: 'r' }] } as Partial<Exam>),
        ]),
        findOne: jest.fn().mockResolvedValue(classExamEntity()),
      },
    });
    const res = await service.findExams({ page: 1, limit: 30 });
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(2);
    expect(res.stats.total).toBe(2);
    expect(res.stats.draft).toBe(1);
    expect(res.stats.finished).toBe(1);
    expect(res.stats.withResults).toBe(1);
    expect(exams.findAndCount).toHaveBeenCalled();
  });
});

describe('ExamService — publish / delete', () => {
  it('qoralamani tayyor holatga keltiradi', async () => {
    const { service, saved } = makeService();
    await service.publishExam(EXAM_ID);
    expect(saved[0].status).toBe(ExamStatus.SCHEDULED);
  });

  it('qoralama bo‘lmasa publish Conflict tashlaydi', async () => {
    const { service, exams } = makeService();
    exams.findOne.mockResolvedValue(classExamEntity({ status: ExamStatus.SCHEDULED }));
    await expect(service.publishExam(EXAM_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('natija kiritilgan imtihon o‘chmaydi', async () => {
    const { service, exams } = makeService();
    exams.findOne.mockResolvedValue(classExamEntity({ results: [{ id: 'r' }] } as Partial<Exam>));
    await expect(service.deleteExam(EXAM_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('yakunlangan imtihon o‘chmaydi', async () => {
    const { service, exams } = makeService();
    exams.findOne.mockResolvedValue(classExamEntity({ status: ExamStatus.FINISHED }));
    await expect(service.deleteExam(EXAM_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('bo‘sh, qoralama imtihonni soft-delete qiladi', async () => {
    const { service, exams } = makeService();
    await service.deleteExam(EXAM_ID);
    expect(exams.softDelete).toHaveBeenCalledWith(EXAM_ID);
  });
});
