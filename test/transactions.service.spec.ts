import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../src/modules/audit/audit.service';
import type { FinanceTransaction } from '../src/modules/finance/entities/transaction.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { PaymentType } from '../src/modules/transactions/entities/payment-type.entity';
import type { TransactionCategory } from '../src/modules/transactions/entities/transaction-category.entity';
import { TransactionCategoryKind } from '../src/modules/transactions/entities/transaction-category.entity';
import { TransactionType } from '../src/modules/transactions/dto/create-transaction.dto';
import { TransactionsService } from '../src/modules/transactions/transactions.service';

const txId = '11111111-1111-1111-1111-111111111111';
const catId = '22222222-2222-2222-2222-222222222222';
const ptId = '33333333-3333-3333-3333-333333333333';
const personId = '44444444-4444-4444-4444-444444444444';

const baseTx = (over: Partial<FinanceTransaction> = {}): FinanceTransaction =>
  ({
    id: txId,
    sourceType: 'manual',
    type: 'income',
    amount: 500000,
    date: '2026-06-24',
    method: null,
    purposeCategoryId: catId,
    purposeCategory: { id: catId, name: 'O‘quvchi to‘lovi' } as TransactionCategory,
    paymentTypeId: ptId,
    paymentType: { id: ptId, name: 'Naqd' } as PaymentType,
    personId,
    personName: 'Valiyev Ali',
    personRole: 'STUDENT',
    month: 6,
    year: 2026,
    note: 'Iyun to‘lovi',
    receiptFileId: null,
    discountPercent: null,
    price: null,
    classId: null,
    studentId: null,
    createdAt: new Date('2026-06-24T07:00:00.000Z'),
    updatedAt: new Date('2026-06-24T07:00:00.000Z'),
    deletedAt: null,
    version: 1,
    ...over,
  }) as FinanceTransaction;

/** Chainable QueryBuilder mock — barcha metodlar `qb` ni qaytaradi. */
function makeQb() {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    'leftJoin', 'leftJoinAndSelect', 'addSelect', 'select', 'andWhere', 'where',
    'orderBy', 'addOrderBy', 'groupBy', 'addGroupBy', 'skip', 'take', 'setParameters',
  ]) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getManyAndCount = jest.fn();
  qb.getMany = jest.fn();
  qb.getCount = jest.fn();
  qb.getRawOne = jest.fn();
  qb.getRawMany = jest.fn();
  return qb;
}

describe('TransactionsService', () => {
  const actor = {
    userId: 'admin-1',
    username: 'Asad Admin',
    role: 'admin',
    permissions: [] as string[],
    ipAddress: '127.0.0.1',
  };

  let transactions: jest.Mocked<
    Pick<Repository<FinanceTransaction>, 'create' | 'save' | 'findOne' | 'softDelete' | 'createQueryBuilder'>
  >;
  let paymentTypes: {
    find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock;
    softDelete: jest.Mock; count: jest.Mock; createQueryBuilder: jest.Mock;
  };
  let categories: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock; softDelete: jest.Mock };
  let users: { findOne: jest.Mock };
  let audit: { log: jest.Mock };
  let qb: ReturnType<typeof makeQb>;
  let ptQb: ReturnType<typeof makeQb>;
  let service: TransactionsService;

  beforeEach(() => {
    qb = makeQb();
    ptQb = makeQb();
    transactions = {
      create: jest.fn((x) => x as FinanceTransaction),
      save: jest.fn(async (x) => ({ id: txId, ...x }) as FinanceTransaction),
      findOne: jest.fn().mockResolvedValue(baseTx()),
      softDelete: jest.fn(async () => ({ affected: 1 }) as never),
      createQueryBuilder: jest.fn(() => qb),
    } as never;
    paymentTypes = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: ptId, name: 'Naqd' }),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: ptId, ...x })),
      softDelete: jest.fn(async () => ({ affected: 1 })),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ptQb),
    };
    categories = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: catId, name: 'O‘quvchi to‘lovi', kind: TransactionCategoryKind.INCOME }),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: catId, ...x })),
      softDelete: jest.fn(async () => ({ affected: 1 })),
    };
    users = {
      findOne: jest.fn().mockResolvedValue({
        id: personId,
        firstName: 'Ali',
        lastName: 'Valiyev',
        username: 'ali',
        roles: [{ name: 'STUDENT' }],
      }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const tenant = { getSchoolId: () => null, getBranchId: () => null };

    service = new TransactionsService(
      transactions as never as Repository<FinanceTransaction>,
      paymentTypes as never as Repository<PaymentType>,
      categories as never as Repository<TransactionCategory>,
      users as never as Repository<User>,
      audit as never as AuditService,
      tenant as unknown as import('../src/common/tenant/tenant-context.service').TenantContextService,
    );
  });

  describe('create', () => {
    it('snapshots the person name/role and writes an audit log', async () => {
      const result = await service.create(
        { type: TransactionType.INCOME, amount: 500000, purposeCategoryId: catId, paymentTypeId: ptId, personId, date: '2026-06-24' },
        actor,
      );
      expect(transactions.save).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: 'manual', personName: 'Valiyev Ali', personRole: 'STUDENT', month: 6, year: 2026 }),
      );
      expect(result.amount).toBe(500000);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'transaction.created', entity: 'transaction' }));
    });

    it('rejects a category whose kind does not match the transaction type', async () => {
      categories.findOne.mockResolvedValue({ id: catId, name: 'Maosh', kind: TransactionCategoryKind.EXPENSE });
      await expect(
        service.create({ type: TransactionType.INCOME, amount: 1000, purposeCategoryId: catId }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when the person does not exist', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        service.create({ type: TransactionType.EXPENSE, amount: 1000, personId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('defaults the date and derives month/year', async () => {
      categories.findOne.mockResolvedValue({ id: catId, name: 'Grant', kind: TransactionCategoryKind.BOTH });
      await service.create({ type: TransactionType.INCOME, amount: 200, purposeCategoryId: catId });
      const saved = transactions.save.mock.calls[0][0] as FinanceTransaction;
      expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(saved.month).toBeGreaterThanOrEqual(1);
      expect(saved.year).toBeGreaterThanOrEqual(2026);
    });
  });

  describe('findAll', () => {
    it('returns paginated items, meta and balance stats', async () => {
      qb.getManyAndCount.mockResolvedValue([[baseTx()], 1]);
      qb.getRawOne.mockResolvedValue({ income: '500000', expense: '200000', count: '1' });

      const result = await service.findAll({ page: 2, limit: 50 });

      expect(qb.skip).toHaveBeenCalledWith(50); // (2-1)*50
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(result.meta).toEqual({ page: 2, limit: 50, total: 1, pageCount: 1 });
      expect(result.stats).toEqual({ totalIncome: 500000, totalExpense: 200000, balance: 300000, count: 1 });
      expect(result.items[0].paymentTypeName).toBe('Naqd');
    });

    it('applies type, person and date filters', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      qb.getRawOne.mockResolvedValue({ income: '0', expense: '0', count: '0' });
      await service.findAll({ type: TransactionType.EXPENSE as never, personId, dateFrom: '2026-06-01', dateTo: '2026-06-30' });
      expect(qb.andWhere).toHaveBeenCalledWith('tx.type = :type', { type: 'expense' });
      expect(qb.andWhere).toHaveBeenCalledWith('tx.person_id = :personId', { personId });
      expect(qb.andWhere).toHaveBeenCalledWith('tx.date >= :dateFrom', { dateFrom: '2026-06-01' });
    });
  });

  describe('statistics', () => {
    it('aggregates monthly income/expense with a net field', async () => {
      qb.getRawOne.mockResolvedValue({ income: '700000', expense: '300000', count: '3' });
      qb.getRawMany
        .mockResolvedValueOnce([{ month: '6', income: '700000', expense: '300000' }]) // monthly
        .mockResolvedValueOnce([{ id: catId, name: 'O‘quvchi to‘lovi', amount: '700000', count: '2' }]) // byCategory
        .mockResolvedValueOnce([{ id: ptId, name: 'Naqd', amount: '700000', count: '2' }]); // byPaymentType

      const result = await service.statistics({});
      expect(result.totals.balance).toBe(400000);
      expect(result.monthly[0]).toEqual({ month: 6, income: 700000, expense: 300000, net: 400000 });
      expect(result.byCategory[0].amount).toBe(700000);
    });
  });

  describe('update', () => {
    it('throws when no fields are provided', async () => {
      await expect(service.update(txId, {}, actor)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates amount and logs an audit entry', async () => {
      const result = await service.update(txId, { amount: 999 }, actor);
      expect(transactions.save).toHaveBeenCalledWith(expect.objectContaining({ amount: 999 }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'transaction.updated' }));
      expect(result.id).toBe(txId);
    });
  });

  describe('remove', () => {
    it('soft-deletes and writes an audit log', async () => {
      await service.remove(txId, actor);
      expect(transactions.softDelete).toHaveBeenCalledWith(txId);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'transaction.deleted' }));
    });
  });

  describe('egalik (ownership) nazorati', () => {
    it('create yaratuvchi audit maydonlarini yozadi', async () => {
      categories.findOne.mockResolvedValue({ id: catId, name: 'Maosh', kind: TransactionCategoryKind.BOTH });
      await service.create({ type: 'income' as TransactionType, amount: 100 }, actor);
      const saved = transactions.save.mock.calls[0][0] as FinanceTransaction;
      expect(saved.createdBy).toBe('admin-1');
      expect(saved.createdByName).toBe('Asad Admin');
      expect(saved.updatedBy).toBe('admin-1');
    });

    it('boshqa xodimning yozuvini tahrirlashga ruxsat bermaydi (403)', async () => {
      transactions.findOne.mockResolvedValue(baseTx({ createdBy: 'other-user' }));
      await expect(service.update(txId, { amount: 100 }, actor)).rejects.toBeInstanceOf(ForbiddenException);
      expect(transactions.save).not.toHaveBeenCalled();
    });

    it('egasi o‘z yozuvini tahrirlay oladi', async () => {
      transactions.findOne.mockResolvedValue(baseTx({ createdBy: 'admin-1' }));
      await expect(service.update(txId, { amount: 100 }, actor)).resolves.toBeDefined();
      expect(transactions.save).toHaveBeenCalled();
    });

    it('super-admin istalgan yozuvni o‘chira oladi', async () => {
      transactions.findOne.mockResolvedValue(baseTx({ createdBy: 'other-user' }));
      const superAdmin = { ...actor, userId: 'root', permissions: ['*.*'] };
      await expect(service.remove(txId, superAdmin)).resolves.toBeUndefined();
      expect(transactions.softDelete).toHaveBeenCalledWith(txId);
    });

    it('egasi noma‘lum eski yozuvga ruxsat beradi (back-compat)', async () => {
      transactions.findOne.mockResolvedValue(baseTx({ createdBy: null }));
      await expect(service.update(txId, { amount: 100 }, actor)).resolves.toBeDefined();
      expect(transactions.save).toHaveBeenCalled();
    });
  });

  describe('payment types & categories', () => {
    it('prevents duplicate payment-type codes', async () => {
      paymentTypes.findOne.mockResolvedValue({ id: ptId, code: 'cash' });
      await expect(service.createPaymentType({ name: 'Naqd' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to delete a system payment type', async () => {
      paymentTypes.findOne.mockResolvedValue({ id: ptId, isSystem: true });
      await expect(service.removePaymentType(ptId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a category that is its own parent', async () => {
      categories.findOne.mockResolvedValue({ id: catId, name: 'X' });
      await expect(service.updateCategory(catId, { parentId: catId })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findPaymentTypes', () => {
    it('returns paginated rows, meta and stats', async () => {
      ptQb.getManyAndCount.mockResolvedValue([
        [{ id: ptId, name: 'Naqd', code: 'cash', isActive: true, isSystem: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() }],
        2,
      ]);
      ptQb.getCount.mockResolvedValue(2);
      paymentTypes.count.mockResolvedValue(2);
      paymentTypes.findOne.mockResolvedValue({ id: ptId, name: 'Naqd', createdAt: new Date('2026-06-09') });

      const result = await service.findPaymentTypes({ page: 1, limit: 10 });

      expect(ptQb.take).toHaveBeenCalledWith(10);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 2, pageCount: 1 });
      expect(result.stats.total).toBe(2);
      expect(result.stats.addedThisMonth).toBe(2);
      expect(result.stats.latestName).toBe('Naqd');
      expect(result.items[0].name).toBe('Naqd');
    });

    it('applies the name search filter', async () => {
      ptQb.getManyAndCount.mockResolvedValue([[], 0]);
      ptQb.getCount.mockResolvedValue(0);
      paymentTypes.count.mockResolvedValue(0);
      paymentTypes.findOne.mockResolvedValue(null);

      await service.findPaymentTypes({ search: 'naq' });
      expect(ptQb.where).toHaveBeenCalledWith('pt.name ILIKE :s', { s: '%naq%' });
    });
  });

  describe('export', () => {
    it('returns mapped rows without pagination', async () => {
      qb.getMany.mockResolvedValue([baseTx(), baseTx({ id: 'other', type: 'expense' })]);
      const rows = await service.export({});
      expect(qb.take).toHaveBeenCalledWith(10000);
      expect(rows).toHaveLength(2);
      expect(rows[1].type).toBe('expense');
    });
  });
});
