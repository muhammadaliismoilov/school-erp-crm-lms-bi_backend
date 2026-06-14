import { validateDto } from '../src/common/validation/validate-dto';
import { CreateClassDto } from '../src/modules/academic/dto/create-class.dto';
import { SendClassSmsDto } from '../src/modules/academic/dto/send-class-sms.dto';
import { TransferClassStudentsDto } from '../src/modules/academic/dto/transfer-class-students.dto';

describe('CreateClassDto', () => {
  it('accepts a production-ready class payload', async () => {
    const errors = await validateDto(CreateClassDto, {
      gradeLevel: 1,
      section: 'A',
      language: 'uz',
      roomId: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
      curatorId: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
      academicYearId: '5c617a45-57a4-4864-89c8-96e299173908',
      capacity: 30,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid class fields and unknown properties', async () => {
    const errors = await validateDto(CreateClassDto, {
      gradeLevel: 0,
      section: 'A-1',
      language: 'de',
      roomId: 'not-uuid',
      curatorId: 'not-uuid',
      academicYearId: 'not-uuid',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('gradeLevel');
    expect(serialized).toContain('section');
    expect(serialized).toContain('language');
    expect(serialized).toContain('roomId');
    expect(serialized).toContain('curatorId');
    expect(serialized).toContain('academicYearId');
    expect(serialized).toContain('extra');
  });
});

describe('TransferClassStudentsDto', () => {
  it('accepts moving selected students to another class', async () => {
    const errors = await validateDto(TransferClassStudentsDto, {
      academicYearId: '5c617a45-57a4-4864-89c8-96e299173908',
      targetClassId: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
      studentIds: ['8cf35a94-92b4-4f1a-8a7a-90a78003892d'],
    });

    expect(errors).toHaveLength(0);
  });
});

describe('SendClassSmsDto', () => {
  it('accepts an immediate message with a plain body', async () => {
    const errors = await validateDto(SendClassSmsDto, { body: 'Salom, ota-onalar!' });
    expect(errors).toHaveLength(0);
  });

  it('accepts a scheduled message that references a template', async () => {
    const errors = await validateDto(SendClassSmsDto, {
      templateId: '5c617a45-57a4-4864-89c8-96e299173908',
      scheduledAt: '2026-06-20T09:00:00.000Z',
      studentIds: ['8cf35a94-92b4-4f1a-8a7a-90a78003892d'],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a message that has neither a template nor a body', async () => {
    const errors = await validateDto(SendClassSmsDto, {});
    expect(JSON.stringify(errors)).toContain('body');
  });

  it('rejects invalid student ids, scheduledAt and unknown properties', async () => {
    const errors = await validateDto(SendClassSmsDto, {
      body: 'Salom',
      studentIds: ['not-uuid'],
      scheduledAt: 'not-a-date',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('studentIds');
    expect(serialized).toContain('scheduledAt');
    expect(serialized).toContain('extra');
  });
});
