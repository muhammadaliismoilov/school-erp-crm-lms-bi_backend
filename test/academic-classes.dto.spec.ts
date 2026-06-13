import { validateDto } from '../src/common/validation/validate-dto';
import { CreateClassDto } from '../src/modules/academic/dto/create-class.dto';
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
