import { validateDto } from '../src/common/validation/validate-dto';
import { CreateGradeRequestDto } from '../src/modules/grade-requests/dto/create-grade-request.dto';
import { GradeRequestQueryDto } from '../src/modules/grade-requests/dto/grade-request-query.dto';
import { ReviewGradeRequestDto } from '../src/modules/grade-requests/dto/review-grade-request.dto';
import {
  GradeRequestKind,
  GradeRequestStatus,
} from '../src/modules/grade-requests/entities/grade-change-request.entity';

const studentId = '11111111-1111-4111-8111-111111111111';
const quarterId = '22222222-2222-4222-8222-222222222222';

describe('CreateGradeRequestDto', () => {
  it('accepts a valid assessment payload', async () => {
    const errors = await validateDto(CreateGradeRequestDto, {
      kind: GradeRequestKind.ASSESSMENT,
      studentId,
      requestedGrade: 5,
      currentGrade: 3,
      reason: 'Imtihon qayta tekshirildi',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid quarter payload with quarterId', async () => {
    const errors = await validateDto(CreateGradeRequestDto, {
      kind: GradeRequestKind.QUARTER,
      studentId,
      quarterId,
      requestedGrade: 4,
      reason: 'Choraklik baho qayta hisoblandi',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid fields and out-of-range grade', async () => {
    const errors = await validateDto(CreateGradeRequestDto, {
      kind: 'weekly',
      studentId: 'not-uuid',
      requestedGrade: 200,
      reason: 'x',
      extra: 'forbidden',
    });
    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('kind');
    expect(serialized).toContain('studentId');
    expect(serialized).toContain('requestedGrade');
    expect(serialized).toContain('reason');
  });
});

describe('GradeRequestQueryDto', () => {
  it('caps the limit at 100', async () => {
    const errors = await validateDto(GradeRequestQueryDto, { limit: 250 });
    expect(JSON.stringify(errors)).toContain('limit');
  });

  it('accepts allowed page sizes', async () => {
    for (const limit of [10, 20, 50, 100]) {
      const errors = await validateDto(GradeRequestQueryDto, { limit });
      expect(errors).toHaveLength(0);
    }
  });
});

describe('ReviewGradeRequestDto', () => {
  it('accepts approved without a note', async () => {
    const errors = await validateDto(ReviewGradeRequestDto, { status: GradeRequestStatus.APPROVED });
    expect(errors).toHaveLength(0);
  });

  it('rejects an unknown status', async () => {
    const errors = await validateDto(ReviewGradeRequestDto, { status: 'maybe' });
    expect(JSON.stringify(errors)).toContain('status');
  });
});
