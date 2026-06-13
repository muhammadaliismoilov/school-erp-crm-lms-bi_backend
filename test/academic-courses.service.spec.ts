import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { Course } from '../src/modules/academic/entities/course.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { Room } from '../src/modules/settings/entities/room.entity';
import type { Student } from '../src/modules/students/entities/student.entity';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService courses CRUD', () => {
  const courseId = '6c617a45-57a4-4864-89c8-96e299173908';
  const quarterId = '5c617a45-57a4-4864-89c8-96e299173908';
  const roomId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';
  const subjectId = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';
  const teacherId = '42f35a94-92b4-4f1a-8a7a-90a78003892d';
  const studentId = '77f35a94-92b4-4f1a-8a7a-90a78003892d';
  const quarter = {
    id: quarterId,
    quarterNumber: 4,
    startDate: '2026-03-26',
    endDate: '2026-06-15',
    name: { uz: '4-chorak', ru: '4-я четверть', en: 'Quarter 4' },
  } as Quarter;
  const room = {
    id: roomId,
    floor: 1,
    roomNumber: '102',
  } as Room;
  const subject = {
    id: subjectId,
    name: { uz: 'Matematika', ru: 'Matematika', en: 'Mathematics' },
    code: 'MATEMATIKA',
    color: '#2563EB',
    status: CommonStatus.ACTIVE,
  } as Subject;
  const teacher = {
    id: teacherId,
    firstName: 'Farrux',
    lastName: 'Xolmatov',
    username: 'farrux',
  } as User;
  const student = {
    id: studentId,
    firstName: 'Aziz',
    lastName: 'Aliyev',
    studentCode: 'S-1',
  } as Student;

  let quarters: jest.Mocked<Pick<Repository<Quarter>, 'findOne'>>;
  let subjects: jest.Mocked<Pick<Repository<Subject>, 'findOne'>>;
  let rooms: jest.Mocked<Pick<Repository<Room>, 'findOne'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let students: jest.Mocked<Pick<Repository<Student>, 'find'>>;
  let courses: jest.Mocked<Pick<Repository<Course>, 'create' | 'save' | 'findOne' | 'find' | 'softDelete'>>;
  let service: AcademicService;

  beforeEach(() => {
    quarters = { findOne: jest.fn() };
    subjects = { findOne: jest.fn() };
    rooms = { findOne: jest.fn() };
    users = { findOne: jest.fn() };
    students = { find: jest.fn() };
    courses = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new AcademicService(
      emptyRepository<AcademicYear>(),
      quarters as unknown as Repository<Quarter>,
      emptyRepository<LessonPeriod>(),
      subjects as unknown as Repository<Subject>,
      emptyRepository<SchoolClass>(),
      rooms as unknown as Repository<Room>,
      users as unknown as Repository<User>,
      students as unknown as Repository<Student>,
      courses as unknown as Repository<Course>,
    );
  });

  it('creates a course with subject, teacher, room, quarter, and selected students', async () => {
    quarters.findOne.mockResolvedValue(quarter);
    subjects.findOne.mockResolvedValue(subject);
    rooms.findOne.mockResolvedValue(room);
    users.findOne.mockResolvedValue(teacher);
    students.find.mockResolvedValue([student]);
    courses.findOne.mockResolvedValue(null);
    courses.create.mockImplementation((value) => value as Course);
    courses.save.mockImplementation(async (value) => ({
      id: courseId,
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
      version: 1,
      ...value,
    }) as Course);

    const result = await service.createCourse({
      name: 'IT',
      quarterId,
      startDate: '2026-03-26',
      endDate: '2026-06-15',
      roomId,
      description: 'Frontend kursi',
      subjectId,
      teacherId,
      plannedLessonCount: 24,
      studentIds: [studentId],
    });

    expect(courses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'IT',
        normalizedName: 'it',
        quarterId,
        roomId,
        subjectId,
        teacherId,
        plannedLessonCount: 24,
        completedLessonCount: 0,
        status: CommonStatus.ACTIVE,
        students: [student],
      }),
    );
    expect(result).toMatchObject({
      id: courseId,
      name: 'IT',
      quarter: { id: quarterId, quarterNumber: 4 },
      room: { id: roomId, label: '1-qavat 102' },
      subject: { id: subjectId, name: 'Matematika' },
      teacher: { id: teacherId, fullName: 'Farrux Xolmatov' },
      stats: { plannedLessonCount: 24, completedLessonCount: 0, studentCount: 1 },
    });
  });

  it('rejects duplicate course names inside the same quarter', async () => {
    quarters.findOne.mockResolvedValue(quarter);
    subjects.findOne.mockResolvedValue(subject);
    rooms.findOne.mockResolvedValue(room);
    users.findOne.mockResolvedValue(teacher);
    courses.findOne.mockResolvedValue({ id: courseId } as Course);

    await expect(
      service.createCourse({
        name: 'IT',
        quarterId,
        startDate: '2026-03-26',
        endDate: '2026-06-15',
        roomId,
        subjectId,
        teacherId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects course dates outside quarter range', async () => {
    quarters.findOne.mockResolvedValue(quarter);
    subjects.findOne.mockResolvedValue(subject);
    rooms.findOne.mockResolvedValue(room);
    users.findOne.mockResolvedValue(teacher);

    await expect(
      service.createCourse({
        name: 'IT',
        quarterId,
        startDate: '2026-03-01',
        endDate: '2026-06-15',
        roomId,
        subjectId,
        teacherId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds students to an existing course without duplicating selected students', async () => {
    courses.findOne.mockResolvedValue({
      id: courseId,
      name: 'IT',
      normalizedName: 'it',
      quarterId,
      quarter,
      roomId,
      room,
      subjectId,
      subject,
      teacherId,
      teacher,
      startDate: '2026-03-26',
      endDate: '2026-06-15',
      plannedLessonCount: 24,
      completedLessonCount: 0,
      status: CommonStatus.ACTIVE,
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
      version: 1,
      students: [],
    } as Course);
    students.find.mockResolvedValue([student]);
    courses.save.mockImplementation(async (value) => value as Course);

    const result = await service.addCourseStudents(courseId, { studentIds: [studentId] });

    expect(courses.save).toHaveBeenCalledWith(expect.objectContaining({ students: [student] }));
    expect(result.students).toHaveLength(1);
    expect(result.stats.studentCount).toBe(1);
  });
});
