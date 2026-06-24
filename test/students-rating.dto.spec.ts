import { validateDto } from '../src/common/validation/validate-dto';
import { LeadersQueryDto } from '../src/modules/students-rating/dto/leaders-query.dto';
import { RatingQueryDto } from '../src/modules/students-rating/dto/rating-query.dto';

const yearId = '11111111-1111-4111-8111-111111111111';
const classId = '22222222-2222-4222-8222-222222222222';

describe('RatingQueryDto', () => {
  it('bo‘sh so‘rovni qabul qiladi (default qiymatlar)', async () => {
    const errors = await validateDto(RatingQueryDto, {});
    expect(errors).toHaveLength(0);
  });

  it.each([10, 20, 50, 100])('limit %i ni qabul qiladi', async (limit) => {
    const errors = await validateDto(RatingQueryDto, { limit });
    expect(errors).toHaveLength(0);
  });

  it('to‘liq to‘g‘ri so‘rovni qabul qiladi', async () => {
    const errors = await validateDto(RatingQueryDto, {
      page: 2,
      limit: 50,
      search: 'Ali',
      academicYearId: yearId,
      gradeLevel: 1,
      classId,
    });
    expect(errors).toHaveLength(0);
  });

  it('limit 100 dan oshsa rad etadi', async () => {
    const errors = await validateDto(RatingQueryDto, { limit: 101 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('noto‘g‘ri UUID va sinf darajasini rad etadi', async () => {
    const errors = await validateDto(RatingQueryDto, { academicYearId: 'not-uuid', gradeLevel: 99 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('page 1 dan kichik bo‘lsa rad etadi', async () => {
    const errors = await validateDto(RatingQueryDto, { page: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('LeadersQueryDto', () => {
  it.each([10, 20])('limit %i ni qabul qiladi', async (limit) => {
    const errors = await validateDto(LeadersQueryDto, { limit });
    expect(errors).toHaveLength(0);
  });

  it.each([5, 15, 50, 100])('limit %i ni rad etadi (faqat 10/20)', async (limit) => {
    const errors = await validateDto(LeadersQueryDto, { limit });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('filtrlar bilan to‘g‘ri so‘rovni qabul qiladi', async () => {
    const errors = await validateDto(LeadersQueryDto, { limit: 20, academicYearId: yearId, gradeLevel: 1, classId });
    expect(errors).toHaveLength(0);
  });
});
