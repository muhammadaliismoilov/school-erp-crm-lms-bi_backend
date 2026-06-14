import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { Course } from '../src/modules/academic/entities/course.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { JournalEntry } from '../src/modules/lms/entities/journal-entry.entity';
import type { LessonSchedule } from '../src/modules/lms/entities/lesson-schedule.entity';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService subjects CRUD', () => {
  const subjectId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';

  let subjects: jest.Mocked<
    Pick<Repository<Subject>, 'create' | 'save' | 'find' | 'findOne' | 'softDelete'>
  >;
  let service: AcademicService;

  beforeEach(() => {
    subjects = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new AcademicService(
      emptyRepository<AcademicYear>(),
      emptyRepository<Quarter>(),
      emptyRepository<LessonPeriod>(),
      subjects as unknown as Repository<Subject>,
      emptyRepository<SchoolClass>(),
    );
  });

  it('creates a subject with localized names, generated code, color, and active status', async () => {
    subjects.findOne.mockResolvedValue(null);
    subjects.create.mockImplementation((value) => value as Subject);
    subjects.save.mockImplementation(async (value) => ({
      id: subjectId,
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
      version: 1,
      ...value,
    }) as Subject);

    const result = await service.createSubject({
      name: 'Matematika',
      russianName: 'Matematika',
      color: '#2563EB',
    });

    expect(subjects.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { uz: 'Matematika', ru: 'Matematika', en: 'Matematika' },
        code: 'MATEMATIKA',
        color: '#2563EB',
        status: CommonStatus.ACTIVE,
      }),
    );
    expect(result).toMatchObject({
      id: subjectId,
      name: 'Matematika',
      russianName: 'Matematika',
      code: 'MATEMATIKA',
      color: '#2563EB',
      status: CommonStatus.ACTIVE,
      isActive: true,
    });
  });

  it('creates an inactive subject when the active toggle is off', async () => {
    subjects.findOne.mockResolvedValue(null);
    subjects.create.mockImplementation((value) => value as Subject);
    subjects.save.mockImplementation(async (value) => ({ id: subjectId, ...value }) as Subject);

    const result = await service.createSubject({
      name: 'Matematika',
      russianName: 'Matem',
      color: '#2563EB',
      isActive: false,
    });

    expect(subjects.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: CommonStatus.INACTIVE }),
    );
    expect(result).toMatchObject({ status: CommonStatus.INACTIVE, isActive: false });
  });

  it('rejects duplicate subject names or codes', async () => {
    subjects.findOne.mockResolvedValue({ id: subjectId } as Subject);

    await expect(
      service.createSubject({
        name: 'Matematika',
        russianName: 'Matematika',
        color: '#2563EB',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns subjects ordered by name and mapped for settings UI', async () => {
    subjects.find.mockResolvedValue([
      {
        id: subjectId,
        name: { uz: 'Ona tili', ru: 'Rodnoy yazik', en: 'Mother tongue' },
        code: 'ONA_TILI',
        color: '#059669',
        status: CommonStatus.ACTIVE,
        createdAt: new Date('2026-06-08T00:00:00.000Z'),
        updatedAt: new Date('2026-06-08T00:00:00.000Z'),
        version: 2,
      } as Subject,
    ]);

    const result = await service.findSubjects({ search: 'ona', status: CommonStatus.ACTIVE });

    expect(subjects.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { normalizedName: 'ASC' },
      }),
    );
    expect(result.stats).toEqual({ total: 1, active: 1, inactive: 0 });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: subjectId,
        name: 'Ona tili',
        russianName: 'Rodnoy yazik',
        localizedName: { uz: 'Ona tili', ru: 'Rodnoy yazik', en: 'Mother tongue' },
        isActive: true,
      }),
    ]);
  });

  it('updates a subject and supports the active toggle', async () => {
    const subject = {
      id: subjectId,
      name: { uz: 'Ingliz tili', ru: 'Angliyskiy yazik', en: 'English' },
      code: 'INGLIZ_TILI',
      color: '#0EA5E9',
      status: CommonStatus.ACTIVE,
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
      version: 1,
    } as Subject;
    subjects.findOne.mockResolvedValueOnce(subject).mockResolvedValueOnce(null);
    subjects.save.mockImplementation(async (value) => ({
      ...value,
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
    }) as Subject);

    const result = await service.updateSubject(subjectId, {
      name: 'Ingliz tili',
      russianName: 'Angliyskiy yazik',
      color: '#16A34A',
      isActive: false,
    });

    expect(subjects.save).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#16A34A',
        status: CommonStatus.INACTIVE,
      }),
    );
    expect(result).toMatchObject({
      color: '#16A34A',
      status: CommonStatus.INACTIVE,
      isActive: false,
    });
  });

  it('throws BadRequestException for empty update payload', async () => {
    await expect(service.updateSubject(subjectId, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when subject does not exist', async () => {
    subjects.findOne.mockResolvedValue(null);

    await expect(service.findSubject(subjectId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('archives a subject with soft delete', async () => {
    subjects.findOne.mockResolvedValue({ id: subjectId } as Subject);
    subjects.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteSubject(subjectId);

    expect(subjects.softDelete).toHaveBeenCalledWith(subjectId);
  });
});

describe('AcademicService subjects hardening', () => {
  const subjectId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';
  const teacherId = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';

  const makeMasteryQb = (avg: string | null) => ({
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ avgGrade: avg }),
  });

  let subjects: jest.Mocked<Pick<Repository<Subject>, 'findOne' | 'softDelete'>>;
  let courses: jest.Mocked<Pick<Repository<Course>, 'count'>>;
  let journal: { createQueryBuilder: jest.Mock };
  let lessons: jest.Mocked<Pick<Repository<LessonSchedule>, 'count' | 'find'>>;
  let audit: { log: jest.Mock };
  let service: AcademicService;

  beforeEach(() => {
    subjects = { findOne: jest.fn(), softDelete: jest.fn() };
    courses = { count: jest.fn().mockResolvedValue(0) };
    journal = { createQueryBuilder: jest.fn().mockReturnValue(makeMasteryQb('3.9')) };
    lessons = { count: jest.fn().mockResolvedValue(0), find: jest.fn().mockResolvedValue([]) };
    audit = { log: jest.fn() };

    service = new AcademicService(
      emptyRepository<AcademicYear>(),
      emptyRepository<Quarter>(),
      emptyRepository<LessonPeriod>(),
      subjects as unknown as Repository<Subject>,
      emptyRepository<SchoolClass>(),
      undefined, // rooms
      undefined, // users
      undefined, // students
      courses as unknown as Repository<Course>,
      undefined, // attendance
      journal as unknown as Repository<JournalEntry>,
      undefined, // communication
      audit as unknown as never,
      lessons as unknown as Repository<LessonSchedule>,
    );
  });

  it('refuses to delete a subject still used by lessons or courses', async () => {
    subjects.findOne.mockResolvedValue({ id: subjectId, code: 'MATH' } as Subject);
    lessons.count.mockResolvedValue(3);

    await expect(service.deleteSubject(subjectId)).rejects.toBeInstanceOf(ConflictException);
    expect(subjects.softDelete).not.toHaveBeenCalled();
  });

  it('builds a subject overview with distinct classes, teachers and average mastery', async () => {
    subjects.findOne.mockResolvedValue({
      id: subjectId,
      name: { uz: 'Ona tili', ru: 'Ona tili', en: 'Ona tili' },
      code: 'ONA_TILI',
      color: '#059669',
      status: CommonStatus.ACTIVE,
    } as Subject);
    lessons.find.mockResolvedValue([
      { class: { id: 'c1', name: '1-A' }, teacher: { id: 't1', firstName: 'A', lastName: 'B', username: 'a' } },
      { class: { id: 'c1', name: '1-A' }, teacher: { id: 't2', firstName: 'C', lastName: 'D', username: 'c' } },
      { class: { id: 'c2', name: '2-B' }, teacher: { id: 't1', firstName: 'A', lastName: 'B', username: 'a' } },
    ] as unknown as LessonSchedule[]);

    const result = await service.findSubjectOverview(subjectId);

    expect(result.stats).toMatchObject({ classCount: 2, teacherCount: 2, lessonCount: 3, averageMastery: 3.9 });
    expect(result.classes).toHaveLength(2);
    expect(result.teachers).toHaveLength(2);
  });

  it('maps the subject schedule with ISO weekday', async () => {
    subjects.findOne.mockResolvedValue({ id: subjectId } as Subject);
    lessons.find.mockResolvedValue([
      {
        id: 'l1',
        lessonDate: '2026-06-24', // Wednesday
        classId: 'c1',
        class: { id: 'c1', name: '1-A' },
        teacher: { id: 't1', firstName: 'A', lastName: 'B', username: 'a' },
        lessonPeriod: { code: '1-dars', startTime: '08:30:00', endTime: '09:15:00' },
        status: 'planned',
      },
    ] as unknown as LessonSchedule[]);

    const result = await service.findSubjectSchedule(subjectId, { teacherId });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'l1',
      weekday: 3,
      class: { id: 'c1', name: '1-A' },
      periodLabel: '1-dars',
      startTime: '08:30',
      endTime: '09:15',
    });
  });
});
