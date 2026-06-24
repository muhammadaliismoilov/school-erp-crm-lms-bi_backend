import { validateDto } from '../src/common/validation/validate-dto';
import {
  AverageReportQueryDto,
  ProgressExamReportQueryDto,
  QuarterlyReportQueryDto,
} from '../src/modules/progress-reports/dto/progress-report-query.dto';

const classId = '11111111-1111-4111-8111-111111111111';
const subjectId = '22222222-2222-4222-8222-222222222222';
const quarterId = '33333333-3333-4333-8333-333333333333';

describe('AverageReportQueryDto', () => {
  it('bo‘sh so‘rovni qabul qiladi', async () => {
    expect(await validateDto(AverageReportQueryDto, {})).toHaveLength(0);
  });

  it.each([10, 20, 50, 100])('limit %i ni qabul qiladi', async (limit) => {
    expect(await validateDto(AverageReportQueryDto, { classId, quarterId, limit })).toHaveLength(0);
  });

  it('limit 100 dan oshsa rad etadi', async () => {
    expect((await validateDto(AverageReportQueryDto, { limit: 101 })).length).toBeGreaterThan(0);
  });

  it('noto‘g‘ri UUID ni rad etadi', async () => {
    expect((await validateDto(AverageReportQueryDto, { classId: 'nope' })).length).toBeGreaterThan(0);
  });
});

describe('QuarterlyReportQueryDto', () => {
  it('fan va chorak filtri bilan to‘g‘ri so‘rovni qabul qiladi', async () => {
    expect(await validateDto(QuarterlyReportQueryDto, { classId, subjectId, quarterId, limit: 50 })).toHaveLength(0);
  });
});

describe('ProgressExamReportQueryDto', () => {
  it('to‘liq filtrli so‘rovni qabul qiladi', async () => {
    expect(await validateDto(ProgressExamReportQueryDto, { classId, subjectId, quarterId, page: 2, limit: 20 })).toHaveLength(0);
  });

  it('page 1 dan kichik bo‘lsa rad etadi', async () => {
    expect((await validateDto(ProgressExamReportQueryDto, { page: 0 })).length).toBeGreaterThan(0);
  });
});
