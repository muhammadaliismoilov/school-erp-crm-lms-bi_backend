import { validateDto } from '../src/common/validation/validate-dto';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { CreateSubjectDto } from '../src/modules/academic/dto/create-subject.dto';
import { SubjectQueryDto } from '../src/modules/academic/dto/subject-query.dto';
import { UpdateSubjectDto } from '../src/modules/academic/dto/update-subject.dto';

describe('CreateSubjectDto', () => {
  it('accepts a production-ready subject payload', async () => {
    const errors = await validateDto(CreateSubjectDto, {
      name: 'Matematika',
      russianName: 'Matematika',
      color: '#2563EB',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid subject fields and unknown properties', async () => {
    const errors = await validateDto(CreateSubjectDto, {
      name: '',
      russianName: '',
      color: 'blue',
      code: 'invalid code',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('name');
    expect(serialized).toContain('russianName');
    expect(serialized).toContain('color');
    expect(serialized).toContain('code');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateSubjectDto', () => {
  it('accepts edit payload with active toggle', async () => {
    const errors = await validateDto(UpdateSubjectDto, {
      name: 'Ingliz tili',
      russianName: 'Angliyskiy yazik',
      color: '#16A34A',
      isActive: false,
    });

    expect(errors).toHaveLength(0);
  });
});

describe('SubjectQueryDto', () => {
  it('accepts search and status filters', async () => {
    const errors = await validateDto(SubjectQueryDto, {
      search: 'mat',
      status: CommonStatus.ACTIVE,
    });

    expect(errors).toHaveLength(0);
  });
});
