import { validateDto } from '../src/common/validation/validate-dto';
import { CreateStudentPaymentDto } from '../src/modules/student-payments/dto/create-student-payment.dto';
import { StudentPaymentQueryDto } from '../src/modules/student-payments/dto/student-payment-query.dto';
import { StudentPaymentStatus } from '../src/modules/student-payments/entities/student-payment.entity';

const studentId = '11111111-1111-4111-8111-111111111111';
const ptId = '22222222-2222-4222-8222-222222222222';
const classId = '33333333-3333-4333-8333-333333333333';

describe('StudentPaymentQueryDto', () => {
  it('bo‘sh so‘rovni qabul qiladi', async () => {
    expect(await validateDto(StudentPaymentQueryDto, {})).toHaveLength(0);
  });

  it.each([10, 20, 50, 100])('limit %i ni qabul qiladi', async (limit) => {
    expect(await validateDto(StudentPaymentQueryDto, { limit })).toHaveLength(0);
  });

  it('limit 100 dan oshsa rad etadi', async () => {
    expect((await validateDto(StudentPaymentQueryDto, { limit: 101 })).length).toBeGreaterThan(0);
  });

  it('oy 12 dan oshsa rad etadi', async () => {
    expect((await validateDto(StudentPaymentQueryDto, { month: 13 })).length).toBeGreaterThan(0);
  });

  it('noto‘g‘ri holatni rad etadi', async () => {
    expect((await validateDto(StudentPaymentQueryDto, { status: 'done' })).length).toBeGreaterThan(0);
  });

  it('noto‘g‘ri sana formatini rad etadi', async () => {
    expect((await validateDto(StudentPaymentQueryDto, { dateFrom: '24-06-2026' })).length).toBeGreaterThan(0);
  });

  it('to‘liq filtrli so‘rovni qabul qiladi', async () => {
    const ok = await validateDto(StudentPaymentQueryDto, {
      search: 'Ali',
      month: 6,
      year: 2026,
      paymentTypeId: ptId,
      paymentTypeCode: 'cash',
      classId,
      studentId,
      status: StudentPaymentStatus.PAID,
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      page: 2,
      limit: 50,
    });
    expect(ok).toHaveLength(0);
  });
});

describe('CreateStudentPaymentDto', () => {
  it('minimal to‘lovni qabul qiladi', async () => {
    expect(await validateDto(CreateStudentPaymentDto, { studentId, amount: 500000 })).toHaveLength(0);
  });

  it('studentId UUID bo‘lmasa rad etadi', async () => {
    expect((await validateDto(CreateStudentPaymentDto, { studentId: 'abc', amount: 100 })).length).toBeGreaterThan(0);
  });

  it('summa manfiy bo‘lsa rad etadi', async () => {
    expect((await validateDto(CreateStudentPaymentDto, { studentId, amount: -1 })).length).toBeGreaterThan(0);
  });

  it('summa 0 ni qabul qiladi (kutilmoqda holati uchun)', async () => {
    expect(await validateDto(CreateStudentPaymentDto, { studentId, amount: 0 })).toHaveLength(0);
  });

  it('noto‘g‘ri holatni rad etadi', async () => {
    expect((await validateDto(CreateStudentPaymentDto, { studentId, amount: 100, status: 'x' })).length).toBeGreaterThan(0);
  });

  it('to‘liq to‘lovni qabul qiladi', async () => {
    const ok = await validateDto(CreateStudentPaymentDto, {
      studentId,
      amount: 500000,
      planAmount: 600000,
      paymentTypeId: ptId,
      paymentDate: '2026-06-24',
      month: 6,
      year: 2026,
      receiptNumber: 'KV-2026-00001',
      status: StudentPaymentStatus.PARTIAL,
      note: 'Iyun to‘lovi',
    });
    expect(ok).toHaveLength(0);
  });
});
