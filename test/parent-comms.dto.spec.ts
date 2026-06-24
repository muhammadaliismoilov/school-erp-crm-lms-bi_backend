import { validateDto } from '../src/common/validation/validate-dto';
import { CreateParentCommDto } from '../src/modules/parent-comms/dto/create-parent-comm.dto';
import { ParentCommQueryDto } from '../src/modules/parent-comms/dto/parent-comm-query.dto';
import {
  CommunicationSentiment,
  ParentType,
} from '../src/modules/parent-comms/entities/parent-communication.entity';

const studentId = '11111111-1111-4111-8111-111111111111';

describe('CreateParentCommDto', () => {
  it('accepts a valid payload', async () => {
    const errors = await validateDto(CreateParentCommDto, {
      studentId,
      parentType: ParentType.MOTHER,
      sentiment: CommunicationSentiment.POSITIVE,
      educationScore: 80,
      classLeaderScore: 75,
      purpose: 'Suhbat',
      notes: 'Izoh',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid enums, bad uuid and out-of-range score', async () => {
    const errors = await validateDto(CreateParentCommDto, {
      studentId: 'not-uuid',
      parentType: 'aunt',
      sentiment: 'happy',
      educationScore: 200,
      extra: 'forbidden',
    });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('studentId');
    expect(serialized).toContain('parentType');
    expect(serialized).toContain('sentiment');
    expect(serialized).toContain('educationScore');
  });
});

describe('ParentCommQueryDto', () => {
  it('caps the limit at 100', async () => {
    const errors = await validateDto(ParentCommQueryDto, { limit: 250 });
    expect(JSON.stringify(errors)).toContain('limit');
  });

  it('accepts allowed page sizes and month/year filters', async () => {
    for (const limit of [10, 20, 50, 100]) {
      const errors = await validateDto(ParentCommQueryDto, { limit, year: 2026, month: 6 });
      expect(errors).toHaveLength(0);
    }
  });

  it('rejects an out-of-range month', async () => {
    const errors = await validateDto(ParentCommQueryDto, { month: 13 });
    expect(JSON.stringify(errors)).toContain('month');
  });
});
