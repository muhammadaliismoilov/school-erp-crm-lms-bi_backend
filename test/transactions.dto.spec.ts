import { validateDto } from '../src/common/validation/validate-dto';
import { CreateTransactionDto, TransactionType } from '../src/modules/transactions/dto/create-transaction.dto';
import { TransactionQueryDto } from '../src/modules/transactions/dto/transaction-query.dto';

const catId = '11111111-1111-4111-8111-111111111111';
const personId = '22222222-2222-4222-8222-222222222222';

describe('TransactionQueryDto', () => {
  it('bo‘sh so‘rovni qabul qiladi', async () => {
    expect(await validateDto(TransactionQueryDto, {})).toHaveLength(0);
  });

  it.each([10, 20, 50, 100])('limit %i ni qabul qiladi', async (limit) => {
    expect(await validateDto(TransactionQueryDto, { limit })).toHaveLength(0);
  });

  it('limit 100 dan oshsa rad etadi', async () => {
    expect((await validateDto(TransactionQueryDto, { limit: 101 })).length).toBeGreaterThan(0);
  });

  it('oy 12 dan oshsa rad etadi', async () => {
    expect((await validateDto(TransactionQueryDto, { month: 13 })).length).toBeGreaterThan(0);
  });

  it('noto‘g‘ri sana formatini rad etadi', async () => {
    expect((await validateDto(TransactionQueryDto, { dateFrom: '24-06-2026' })).length).toBeGreaterThan(0);
  });

  it('to‘liq filtrli so‘rovni qabul qiladi', async () => {
    const ok = await validateDto(TransactionQueryDto, {
      type: TransactionType.INCOME,
      purposeCategoryId: catId,
      personId,
      month: 6,
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      page: 2,
      limit: 50,
    });
    expect(ok).toHaveLength(0);
  });
});

describe('CreateTransactionDto', () => {
  it('minimal kirim tranzaksiyasini qabul qiladi', async () => {
    expect(await validateDto(CreateTransactionDto, { type: TransactionType.INCOME, amount: 500000 })).toHaveLength(0);
  });

  it('miqdor 0 yoki manfiy bo‘lsa rad etadi', async () => {
    expect((await validateDto(CreateTransactionDto, { type: TransactionType.INCOME, amount: 0 })).length).toBeGreaterThan(0);
  });

  it('noto‘g‘ri turni rad etadi', async () => {
    expect((await validateDto(CreateTransactionDto, { type: 'transfer', amount: 100 })).length).toBeGreaterThan(0);
  });

  it('chegirma 100 dan oshsa rad etadi', async () => {
    expect(
      (await validateDto(CreateTransactionDto, { type: TransactionType.INCOME, amount: 100, discountPercent: 120 })).length,
    ).toBeGreaterThan(0);
  });
});
