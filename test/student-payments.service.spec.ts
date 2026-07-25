import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { AuditService } from '../src/modules/audit/audit.service';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { FinanceTransaction } from '../src/modules/finance/entities/transaction.entity';
import type { PaymentType } from '../src/modules/transactions/entities/payment-type.entity';
import {
  type StudentPayment,
  StudentPaymentStatus,
} from '../src/modules/student-payments/entities/student-payment.entity';
import { StudentPaymentsService } from '../src/modules/student-payments/student-payments.service';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';

const spId = '11111111-1111-1111-1111-111111111111';
const studentId = '22222222-2222-2222-2222-222222222222';
const classId = '33333333-3333-3333-3333-333333333333';
const ptId = '44444444-4444-4444-4444-444444444444';

const basePayment = (over: Partial<StudentPayment> = {}): StudentPayment =>
  ({
    id: spId,
    studentId,
    studentName: 'Valiyev Ali',
    classId,
    className: '5-A',
    amount: 500000,
    planAmount: 600000,
    paymentDate: '2026-06-24',
    month: 6,
    year: 2026,
    paymentTypeId: ptId,
    paymentType: { id: ptId, name: 'Naqd', code: 'cash' } as PaymentType,
    receiptNumber: 'KV-2026-00001',
    status: StudentPaymentStatus.PARTIAL,
    note: null,
    createdAt: new Date('2026-06-24T07:00:00.000Z'),
    updatedAt: new Date('2026-06-24T07:00:00.000Z'),
    deletedAt: null,
    version: 1,
    ...over,
  }) as StudentPayment;

/** Chainable QueryBuilder mock — barcha zanjir metodlari `qb` ni qaytaradi. */
function makeQb() {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    'leftJoin', 'addSelect', 'select', 'andWhere', 'where', 'orderBy', 'addOrderBy',
    'skip', 'take', 'withDeleted', 'setParameter',
  ]) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getManyAndCount = jest.fn();
  qb.getMany = jest.fn();
  qb.getOne = jest.fn().mockResolvedValue(null);
  qb.getCount = jest.fn().mockResolvedValue(0);
  qb.getRawOne = jest.fn();
  return qb;
}

describe('StudentPaymentsService', () => {
  const actor = {
    userId: 'admin-1',
    username: 'Asad Admin',
    role: 'admin',
    permissions: [] as string[],
    ipAddress: '127.0.0.1',
  };

  let payments: jest.Mocked<
    Pick<Repository<StudentPayment>, 'create' | 'save' | 'findOne' | 'softDelete' | 'createQueryBuilder'>
  >;
  let finance: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; softDelete: jest.Mock };
  let students: { findOne: jest.Mock };
  let classes: { findOne: jest.Mock };
  let paymentTypes: { find: jest.Mock; findOne: jest.Mock };
  let audit: { log: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let qb: ReturnType<typeof makeQb>;
  let service: StudentPaymentsService;

  beforeEach(() => {
    qb = makeQb();
    payments = {
      create: jest.fn((x) => x as StudentPayment),
      save: jest.fn(async (x) => ({ id: spId, ...x }) as StudentPayment),
      findOne: jest.fn().mockResolvedValue(basePayment()),
      softDelete: jest.fn(async () => ({ affected: 1 }) as never),
      createQueryBuilder: jest.fn(() => qb),
    } as never;
    finance = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      softDelete: jest.fn(async () => ({ affected: 1 })),
    };
    // Tranzaksiya manageri: entity bo'yicha mos repo mock'ini qaytaradi.
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === FinanceTransaction ? finance : payments,
      ),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };
    students = {
      findOne: jest.fn().mockResolvedValue({
        id: studentId,
        firstName: 'Ali',
        lastName: 'Valiyev',
        studentCode: 'ST-001',
        currentClassId: classId,
        currentClass: { id: classId, name: '5-A' },
      }),
    };
    classes = { findOne: jest.fn() };
    paymentTypes = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: ptId, name: 'Naqd', code: 'cash' }),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new StudentPaymentsService(
      payments as never as Repository<StudentPayment>,
      students as never as Repository<Student>,
      classes as never as Repository<SchoolClass>,
      paymentTypes as never as Repository<PaymentType>,
      audit as never as AuditService,
      dataSource as never as DataSource,
      { getSchoolId: () => null, getBranchId: () => null } as unknown as TenantContextService,
    );
  });

  describe('create', () => {
    it('snapshots student/class name, auto-generates a receipt and writes an audit log', async () => {
      const result = await service.create(
        { studentId, amount: 500000, planAmount: 600000, paymentTypeId: ptId, paymentDate: '2026-06-24' },
        actor,
      );
      const saved = payments.save.mock.calls[0][0] as StudentPayment;
      expect(saved.studentName).toBe('Valiyev Ali');
      expect(saved.className).toBe('5-A');
      expect(saved.receiptNumber).toBe('KV-2026-00001');
      expect(saved.month).toBe(6);
      expect(saved.year).toBe(2026);
      expect(saved.createdBy).toBe('admin-1');
      expect(saved.createdByName).toBe('Asad Admin');
      expect(saved.createdByRole).toBe('admin');
      expect(saved.updatedBy).toBe('admin-1');
      expect(result.amount).toBe(500000);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'student_payment.created', entity: 'student_payment' }),
      );
    });

    it('derives PARTIAL status when amount is below the plan', async () => {
      await service.create({ studentId, amount: 100000, planAmount: 600000 });
      const saved = payments.save.mock.calls[0][0] as StudentPayment;
      expect(saved.status).toBe(StudentPaymentStatus.PARTIAL);
    });

    it('derives PAID status when amount meets or exceeds the plan', async () => {
      await service.create({ studentId, amount: 600000, planAmount: 600000 });
      const saved = payments.save.mock.calls[0][0] as StudentPayment;
      expect(saved.status).toBe(StudentPaymentStatus.PAID);
    });

    it('derives PENDING status when amount is zero', async () => {
      await service.create({ studentId, amount: 0, planAmount: 600000 });
      const saved = payments.save.mock.calls[0][0] as StudentPayment;
      expect(saved.status).toBe(StudentPaymentStatus.PENDING);
    });

    it('continues the receipt sequence from the latest record', async () => {
      qb.getOne.mockResolvedValueOnce({ receiptNumber: 'KV-2026-00041' });
      await service.create({ studentId, amount: 500000, paymentDate: '2026-06-24' });
      const saved = payments.save.mock.calls[0][0] as StudentPayment;
      expect(saved.receiptNumber).toBe('KV-2026-00042');
    });

    it('rejects a duplicate explicit receipt number', async () => {
      qb.getCount.mockResolvedValueOnce(1);
      await expect(
        service.create({ studentId, amount: 100, receiptNumber: 'KV-2026-00001' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when the student does not exist', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(service.create({ studentId, amount: 100 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when the payment type does not exist', async () => {
      paymentTypes.findOne.mockResolvedValue(null);
      await expect(
        service.create({ studentId, amount: 100, paymentTypeId: ptId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('projects an income finance transaction linked by sourceType/sourceId', async () => {
      await service.create({ studentId, amount: 500000, paymentTypeId: ptId, paymentDate: '2026-06-24' });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      const tx = finance.create.mock.calls[0][0] as FinanceTransaction;
      expect(tx.type).toBe('income');
      expect(tx.amount).toBe(500000);
      expect(tx.sourceType).toBe('student_payment');
      expect(tx.sourceId).toBe(spId);
      expect(tx.personRole).toBe('student');
      expect(finance.save).toHaveBeenCalled();
    });

    it('does not project a finance transaction when amount is zero (pending)', async () => {
      await service.create({ studentId, amount: 0, planAmount: 600000 });
      expect(finance.create).not.toHaveBeenCalled();
      expect(finance.save).not.toHaveBeenCalled();
    });
  });

  describe('reconcileFinanceTransactions', () => {
    it('eskirgan tranzaksiya summasini to‘g‘rilaydi (changed 1)', async () => {
      (payments as unknown as { find: jest.Mock }).find = jest.fn().mockResolvedValue([basePayment({ amount: 200000 })]);
      // Har findOne yangi obyekt (real DB xulqi) — `before` mutatsiyadan himoyalanadi.
      finance.findOne.mockImplementation(async () => ({ id: 'tx-1', amount: 20000, deletedAt: null }));
      const res = await service.reconcileFinanceTransactions();
      expect(res).toEqual({ processed: 1, changed: 1 });
      const savedTx = finance.save.mock.calls.at(-1)![0] as FinanceTransaction;
      expect(Number(savedTx.amount)).toBe(200000);
    });

    it('summa to‘g‘ri bo‘lsa changed 0', async () => {
      (payments as unknown as { find: jest.Mock }).find = jest.fn().mockResolvedValue([basePayment({ amount: 200000 })]);
      finance.findOne.mockImplementation(async () => ({ id: 'tx-1', amount: 200000, deletedAt: null }));
      const res = await service.reconcileFinanceTransactions();
      expect(res.changed).toBe(0);
    });
  });

  describe('findAll', () => {
    it('returns paginated items, meta and stats', async () => {
      qb.getManyAndCount.mockResolvedValue([[basePayment()], 1]);
      qb.getRawOne.mockResolvedValue({ plan: '600000', collected: '500000', today: '0', count: '1' });

      const result = await service.findAll({ page: 2, limit: 50 });

      expect(qb.skip).toHaveBeenCalledWith(50); // (2-1)*50
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(result.meta).toEqual({ page: 2, limit: 50, total: 1, pageCount: 1 });
      expect(result.stats).toEqual({
        monthlyPlan: 600000,
        collected: 500000,
        remaining: 100000,
        paidToday: 0,
        count: 1,
      });
      expect(result.items[0].paymentTypeName).toBe('Naqd');
    });

    it('clamps remaining to zero when collected exceeds the plan', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      qb.getRawOne.mockResolvedValue({ plan: '100000', collected: '150000', today: '0', count: '1' });
      const result = await service.findAll({});
      expect(result.stats.remaining).toBe(0);
    });

    it('applies month and payment-type-code filters', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      qb.getRawOne.mockResolvedValue({ plan: '0', collected: '0', today: '0', count: '0' });
      await service.findAll({ month: 6, paymentTypeCode: 'cash' });
      expect(qb.andWhere).toHaveBeenCalledWith('sp.month = :month', { month: 6 });
      expect(qb.andWhere).toHaveBeenCalledWith('paymentType.code = :ptCode', { ptCode: 'cash' });
    });
  });

  describe('update', () => {
    it('throws when no fields are provided', async () => {
      await expect(service.update(spId, {}, actor)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recomputes status when amount changes and logs an audit entry', async () => {
      payments.findOne.mockResolvedValue(basePayment({ planAmount: 600000 }));
      await service.update(spId, { amount: 600000 }, actor);
      const saved = payments.save.mock.calls[0][0] as StudentPayment;
      expect(saved.amount).toBe(600000);
      expect(saved.status).toBe(StudentPaymentStatus.PAID);
      expect(saved.updatedBy).toBe('admin-1');
      expect(saved.updatedByName).toBe('Asad Admin');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'student_payment.updated' }));
    });
  });

  describe('egalik (ownership) nazorati', () => {
    it('boshqa xodimning yozuvini tahrirlashga ruxsat bermaydi (403)', async () => {
      payments.findOne.mockResolvedValue(basePayment({ createdBy: 'other-user' }));
      await expect(service.update(spId, { amount: 100 }, actor)).rejects.toBeInstanceOf(ForbiddenException);
      expect(payments.save).not.toHaveBeenCalled();
    });

    it('egasi o‘z yozuvini tahrirlay oladi', async () => {
      payments.findOne.mockResolvedValue(basePayment({ createdBy: 'admin-1' }));
      await expect(service.update(spId, { amount: 100 }, actor)).resolves.toBeDefined();
      expect(payments.save).toHaveBeenCalled();
    });

    it('super-admin istalgan yozuvni tahrirlay oladi', async () => {
      payments.findOne.mockResolvedValue(basePayment({ createdBy: 'other-user' }));
      const superAdmin = { ...actor, userId: 'root', permissions: ['*.*'] };
      await expect(service.update(spId, { amount: 100 }, superAdmin)).resolves.toBeDefined();
      expect(payments.save).toHaveBeenCalled();
    });

    it('boshqa xodimning yozuvini o‘chirishga ruxsat bermaydi (403)', async () => {
      payments.findOne.mockResolvedValue(basePayment({ createdBy: 'other-user' }));
      await expect(service.remove(spId, actor)).rejects.toBeInstanceOf(ForbiddenException);
      expect(payments.softDelete).not.toHaveBeenCalled();
    });

    it('egasi noma‘lum eski yozuvni tahrirlashga ruxsat beradi (back-compat)', async () => {
      payments.findOne.mockResolvedValue(basePayment({ createdBy: null }));
      await expect(service.update(spId, { amount: 100 }, actor)).resolves.toBeDefined();
      expect(payments.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes and writes an audit log', async () => {
      await service.remove(spId, actor);
      expect(payments.softDelete).toHaveBeenCalledWith(spId);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'student_payment.deleted' }));
    });

    it('soft-deletes the linked finance projection in the same transaction', async () => {
      finance.findOne.mockResolvedValue({ id: 'tx-1', deletedAt: null });
      await service.remove(spId, actor);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(finance.softDelete).toHaveBeenCalledWith('tx-1');
    });
  });

  describe('export', () => {
    it('returns mapped rows without pagination', async () => {
      qb.getMany.mockResolvedValue([basePayment(), basePayment({ id: 'other', status: StudentPaymentStatus.PAID })]);
      const rows = await service.export({});
      expect(qb.take).toHaveBeenCalledWith(10000);
      expect(rows).toHaveLength(2);
      expect(rows[1].status).toBe(StudentPaymentStatus.PAID);
    });
  });

  describe('options', () => {
    it('returns active payment types', async () => {
      paymentTypes.find.mockResolvedValue([
        { id: ptId, name: 'Naqd', code: 'cash', isActive: true, sortOrder: 1 },
      ]);
      const result = await service.options();
      expect(result.paymentTypes).toHaveLength(1);
      expect(result.paymentTypes[0].code).toBe('cash');
    });
  });
});
