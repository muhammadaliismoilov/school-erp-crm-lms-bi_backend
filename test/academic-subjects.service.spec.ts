import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';

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
    expect(result).toEqual([
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
