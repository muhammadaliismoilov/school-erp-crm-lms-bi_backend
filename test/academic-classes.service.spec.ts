import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AttendanceRecord } from '../src/modules/attendance/entities/attendance-record.entity';
import type { JournalEntry } from '../src/modules/lms/entities/journal-entry.entity';
import type { CommunicationService } from '../src/modules/communication/communication.service';
import { CampaignStatus } from '../src/modules/communication/enums/communication.enums';
import type { AuditService } from '../src/modules/audit/audit.service';
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
    Pick<Repository<SchoolClass>, 'create' | 'save' | 'find' | 'findAndCount' | 'findOne' | 'softDelete'>
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
      findAndCount: jest.fn(),
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

  it('refuses to delete a class that still has students', async () => {
    classes.findOne.mockResolvedValue({ id: classId, name: '1-A' } as SchoolClass);
    students.find.mockResolvedValue([{ id: 'student-1' }] as Student[]);

    await expect(service.deleteClass(classId)).rejects.toBeInstanceOf(ConflictException);
    expect(classes.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes an empty class', async () => {
    classes.findOne.mockResolvedValue({ id: classId, name: '1-A' } as SchoolClass);
    students.find.mockResolvedValue([] as Student[]);

    await service.deleteClass(classId);
    expect(classes.softDelete).toHaveBeenCalledWith(classId);
  });

  it('rejects a transfer that exceeds the target class capacity', async () => {
    classes.findOne
      .mockResolvedValueOnce({ id: classId, academicYearId } as SchoolClass)
      .mockResolvedValueOnce({ id: targetClassId, academicYearId, capacity: 2 } as SchoolClass);
    students.find
      .mockResolvedValueOnce([
        { id: 'student-1' },
        { id: 'student-2' },
      ] as Student[])
      .mockResolvedValueOnce([{ id: 'existing-1' }] as Student[]);

    await expect(
      service.transferClassStudents(classId, { academicYearId, targetClassId }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(students.update).not.toHaveBeenCalled();
  });

  it('findClasses — sahifalaydi (skip/take) va curator uchun eager kaskadni bosadi (T-07)', async () => {
    const schoolClass = { id: classId, gradeLevel: 1, section: 'A', academicYearId } as SchoolClass;
    classes.findAndCount.mockResolvedValue([[schoolClass], 42]);
    students.find.mockResolvedValue([]);

    const result = await service.findClasses({ page: 2, limit: 10 } as never);

    expect(classes.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10, loadEagerRelations: false }),
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 42, pageCount: 5 });
    expect(result.items).toHaveLength(1);
  });
});

describe('AcademicService classes hardening', () => {
  const academicYearId = '5c617a45-57a4-4864-89c8-96e299173908';
  const classId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';

  const academicYear = { id: academicYearId, name: '2025/2026' } as AcademicYear;
  const room = { id: 'r1', floor: 1, roomNumber: '101' } as Room;
  const curator = { id: 'c1', firstName: 'Aziz', lastName: 'Toshmatov', username: 'aziz' } as User;
  const schoolClass = {
    id: classId,
    name: '1-A',
    gradeLevel: 1,
    section: 'A',
    language: ClassLanguage.UZ,
    capacity: 30,
    academicYear,
    academicYearId,
    room,
    roomId: 'r1',
    curator,
    curatorId: 'c1',
  } as SchoolClass;

  const makeQueryBuilder = (rows: unknown[]) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  });

  let classes: jest.Mocked<Pick<Repository<SchoolClass>, 'findOne' | 'save' | 'create'>>;
  let students: jest.Mocked<Pick<Repository<Student>, 'find'>>;
  let attendance: { createQueryBuilder: jest.Mock };
  let journal: { createQueryBuilder: jest.Mock };
  let communication: jest.Mocked<Pick<CommunicationService, 'createClassCampaign' | 'findTemplateById'>>;
  let audit: jest.Mocked<Pick<AuditService, 'log'>>;
  let service: AcademicService;

  beforeEach(() => {
    classes = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
    students = { find: jest.fn() };
    attendance = { createQueryBuilder: jest.fn() };
    journal = { createQueryBuilder: jest.fn() };
    communication = { createClassCampaign: jest.fn(), findTemplateById: jest.fn() };
    audit = { log: jest.fn() };

    service = new AcademicService(
      emptyRepository<AcademicYear>(),
      emptyRepository<Quarter>(),
      emptyRepository<LessonPeriod>(),
      emptyRepository<Subject>(),
      classes as unknown as Repository<SchoolClass>,
      emptyRepository<Room>(),
      emptyRepository<User>(),
      students as unknown as Repository<Student>,
      undefined,
      attendance as unknown as Repository<AttendanceRecord>,
      journal as unknown as Repository<JournalEntry>,
      communication as unknown as CommunicationService,
      audit as unknown as AuditService,
    );
  });

  it('computes real attendance and mastery metrics for the class detail', async () => {
    classes.findOne.mockResolvedValue(schoolClass);
    students.find.mockResolvedValue([
      { id: 'student-1', firstName: 'A', lastName: 'A', gender: Gender.MALE },
    ] as Student[]);
    attendance.createQueryBuilder.mockReturnValue(
      makeQueryBuilder([{ studentId: 'student-1', total: '10', present: '9' }]),
    );
    journal.createQueryBuilder.mockReturnValue(
      makeQueryBuilder([{ studentId: 'student-1', avgGrade: '4.5' }]),
    );

    const result = await service.findClass(classId);

    expect(result.stats.averageAttendance).toBe(90);
    expect(result.stats.averageMastery).toBe(4.5);
    expect(result.students[0]).toMatchObject({ attendance: 90, mastery: 4.5 });
  });

  it('sends an immediate SMS to students with a resolved parent phone', async () => {
    classes.findOne.mockResolvedValue(schoolClass);
    students.find.mockResolvedValue([
      {
        id: 'student-1',
        firstName: 'A',
        lastName: 'A',
        parents: [{ isPrimary: true, parent: { phone: '+998901234567' } }],
      },
      {
        id: 'student-2',
        firstName: 'B',
        lastName: 'B',
        parents: [],
      },
    ] as unknown as Student[]);
    communication.createClassCampaign.mockResolvedValue({
      campaignId: 'campaign-1',
      totalRecipients: 1,
      status: CampaignStatus.RUNNING,
      scheduledAt: null,
    });

    const result = await service.sendClassSms(classId, { body: 'Salom' });

    expect(result).toMatchObject({
      campaignId: 'campaign-1',
      channel: 'sms',
      totalRecipients: 1,
      skippedCount: 1,
      status: CampaignStatus.RUNNING,
      scheduledAt: null,
    });
    expect(communication.createClassCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Salom',
        recipients: [{ studentId: 'student-1', phone: '+998901234567' }],
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'class.sms_sent', entity: 'class' }),
    );
  });

  it('rejects an SMS without a template or body', async () => {
    classes.findOne.mockResolvedValue(schoolClass);
    students.find.mockResolvedValue([
      {
        id: 'student-1',
        parents: [{ isPrimary: true, parent: { phone: '+998901234567' } }],
      },
    ] as unknown as Student[]);

    await expect(service.sendClassSms(classId, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an SMS when no recipient has a phone number', async () => {
    classes.findOne.mockResolvedValue(schoolClass);
    students.find.mockResolvedValue([
      { id: 'student-1', parents: [] },
    ] as unknown as Student[]);

    await expect(service.sendClassSms(classId, { body: 'Salom' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
