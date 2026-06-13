import { validateDto } from '../src/common/validation/validate-dto';
import { CreateQuarterDto } from '../src/modules/academic/dto/create-quarter.dto';

describe('CreateQuarterDto', () => {
  it('accepts a production-ready quarter payload', async () => {
    const errors = await validateDto(CreateQuarterDto, {
      academicYearId: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
      quarterNumber: 1,
      startDate: '2025-09-01',
      endDate: '2025-11-05',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid quarter fields and unknown properties', async () => {
    const errors = await validateDto(CreateQuarterDto, {
      academicYearId: 'not-a-uuid',
      quarterNumber: 5,
      startDate: '01-09-2025',
      endDate: '2025-11-05',
      status: 'done',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('academicYearId');
    expect(serialized).toContain('quarterNumber');
    expect(serialized).toContain('startDate');
    // status endi DTO maydoni emas — whitelist uni ham rad etadi.
    expect(serialized).toContain('status');
    expect(serialized).toContain('extra');
  });
});
