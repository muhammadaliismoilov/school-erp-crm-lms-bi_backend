import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import { ClassLanguage } from '../src/modules/academic/dto/create-class.dto';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { Room } from '../src/modules/settings/entities/room.entity';
import { Gender } from '../src/modules/students/enums/student-status.enum';
import type { Student } from '../src/modules/students/entities/student.entity';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService classes CRUD', () => {
  const academicYearId = '5c617a45-57a4-4864-89c8-96e299173908';
  const classId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';
  const targetClassId = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';
  const roomId = '42f35a94-92b4-4f1a-8a7a-90a78003892d';
  const curatorId = '77f35a94-92b4-4f1a-8a7a-90a78003892d';
  const academicYear = {
    id: academicYearId,
    name: '2025/2026',
    startDate: '2025-09-01',
    endDate: '2026-06-15',
  } as AcademicYear;
  const room = {
    id: roomId,
    floor: 1,
    roomNumber: '101',
    normalizedRoomNumber: '101',
  } as Room;
  const curator = {
    id: curatorId,
    firstName: 'Aziz',
    lastName: 'Toshmatov',
    username: 'aziz',
  } as User;

  let academicYears: jest.Mocked<Pick<Repository<AcademicYear>, 'findOne'>>;
  let classes: jest.Mocked<
    Pick<Repository<SchoolClass>, 'create' | 'save' | 'find' | 'findOne' | 'softDelete'>
  >;
  let rooms: jest.Mocked<Pick<Repository<Room>, 'findOne'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let students: jest.Mocked<Pick<Repository<Student>, 'find' | 'update'>>;
  let service: AcademicService;

  beforeEach(() => {
    academicYears = { findOne: jest.fn() };
    classes = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    rooms = { findOne: jest.fn() };
    users = { findOne: jest.fn() };
    students = {
      find: jest.fn(),
      update: jest.fn(),
    };

    service = new AcademicService(
      academicYears as unknown as Repository<AcademicYear>,
      emptyRepository<Quarter>(),
      emptyRepository<LessonPeriod>(),
      emptyRepository<Subject>(),
      classes as unknown as Repository<SchoolClass>,
      rooms as unknown as Repository<Room>,
      users as unknown as Repository<User>,
      students as unknown as Repository<Student>,
    );
  });

  it('creates a class with generated name, room, curator, and academic year', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);
    rooms.findOne.mockResolvedValue(room);
    users.findOne.mockResolvedValue(curator);
    classes.findOne.mockResolvedValue(null);
    classes.create.mockImplementation((value) => value as SchoolClass);
    classes.save.mockImplementation(async (value) => ({ id: classId, ...value }) as SchoolClass);

    const result = await service.createClass({
      gradeLevel: 1,
      section: 'a',
      language: ClassLanguage.UZ,
      roomId,
      curatorId,
      academicYearId,
      capacity: 30,
    });

    expect(result).toMatchObject({
      id: classId,
      name: '1-A',
      gradeLevel: 1,
      section: 'A',
      language: ClassLanguage.UZ,
      room: { id: roomId, label: '1-qavat 101' },
      curator: { id: curatorId, fullName: 'Aziz Toshmatov' },
      academicYear: { id: academicYearId, name: '2025/2026' },
    });
    expect(classes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '1-A',
        gradeLevel: 1,
        section: 'A',
        roomId,
        curatorId,
        academicYearId,
      }),
    );
  });

  it('rejects duplicate class section inside the same academic year', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);
    rooms.findOne.mockResolvedValue(room);
    users.findOne.mockResolvedValue(curator);
    classes.findOne.mockResolvedValue({ id: classId } as SchoolClass);

    await expect(
      service.createClass({
        gradeLevel: 1,
        section: 'A',
        language: ClassLanguage.UZ,
        roomId,
        curatorId,
        academicYearId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a class detail with student metrics', async () => {
    classes.findOne.mockResolvedValue({
      id: classId,
      name: '1-A',
      gradeLevel: 1,
      section: 'A',
      language: ClassLanguage.UZ,
      capacity: 30,
      academicYear,
      academicYearId,
      room,
      roomId,
      curator,
      curatorId,
    } as SchoolClass);
    students.find.mockResolvedValue([
      {
        id: 'student-1',
        firstName: 'Aziz',
        lastName: 'Aliyev',
        gender: Gender.MALE,
        studentCode: 'S-1',
      },
      {
        id: 'student-2',
        firstName: 'Hilola',
        lastName: 'Abdullayeva',
        gender: Gender.FEMALE,
        studentCode: 'S-2',
      },
    ] as Student[]);

    const result = await service.findClass(classId);

    expect(result.stats).toMatchObject({
      studentCount: 2,
      maleCount: 1,
      femaleCount: 1,
      averageMastery: 0,
      averageAttendance: 0,
    });
    expect(result.students).toHaveLength(2);
  });

  it('moves all students from one class to another class', async () => {
    classes.findOne
      .mockResolvedValueOnce({ id: classId, academicYearId } as SchoolClass)
      .mockResolvedValueOnce({ id: targetClassId, academicYearId } as SchoolClass);
    students.find.mockResolvedValue([
      { id: 'student-1', firstName: 'Aziz', lastName: 'Aliyev' },
      { id: 'student-2', firstName: 'Hilola', lastName: 'Abdullayeva' },
    ] as Student[]);
    students.update.mockResolvedValue({ affected: 2, raw: {}, generatedMaps: [] });

    const result = await service.transferClassStudents(classId, {
      academicYearId,
      targetClassId,
    });

    expect(result).toEqual({
      sourceClassId: classId,
      targetClassId,
      movedStudentCount: 2,
    });
    expect(students.update).toHaveBeenCalledWith(['student-1', 'student-2'], {
      currentClassId: targetClassId,
    });
  });

  it('throws NotFoundException when target class does not exist', async () => {
    classes.findOne
      .mockResolvedValueOnce({ id: classId, academicYearId } as SchoolClass)
      .mockResolvedValueOnce(null);

    await expect(
      service.transferClassStudents(classId, {
        academicYearId,
        targetClassId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
