import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { SalaryService } from '../src/modules/finance/salary.service';
import type { TeacherSalary } from '../src/modules/finance/entities/teacher-salary.entity';
import { TeacherSalaryStatus } from '../src/modules/finance/enums/salary-status.enum';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { FinanceTransaction } from '../src/modules/finance/entities/transaction.entity';

function makeSalary(overrides: Partial<TeacherSalary> = {}): TeacherSalary {
  return {
    id: 'sal-1',
    teacherId: 'teacher-1',
    academicYearId: 'year-1',
    period: '2026-05',
    completedLessons: 10,
    ratePerLesson: 50000,
    computedAmount: 500000,
    adjustedLessons: null,
    adjustedAmount: null,
    finalAmount: 500000,
    adjustmentReason: null,
    status: TeacherSalaryStatus.PENDING,
    approvedAt: null,
    approvedBy: null,
    approvedByName: null,
    transactionId: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    teacher: undefined as never,
    academicYear: null,
    ...overrides,
  } as TeacherSalary;
}

function makeTeacher(overrides: Partial<User> = {}): User {
  return {
    id: 'teacher-1',
    username: 'aziz',
    firstName: 'Aziz',
    lastName: 'Toshmatov',
    roles: [{ name: 'teacher' } as never],
    ...overrides,
  } as User;
}

describe('SalaryService', () => {
  let salaries: jest.Mocked<Pick<Repository<TeacherSalary>, 'findOne' | 'save'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let transactions: {
    create: jest.Mock;
    save: jest.Mock;
    manager: { createQueryBuilder: jest.Mock };
  };
  let audit: { log: jest.Mock };
  let service: SalaryService;

  beforeEach(() => {
    salaries = { findOne: jest.fn(), save: jest.fn() };
    users = { findOne: jest.fn() };

    const noCategoryQb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    };
    transactions = {
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({ id: 'tx-1', ...value })),
      manager: { createQueryBuilder: jest.fn().mockReturnValue(noCategoryQb) },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    salaries.save.mockImplementation(async (value) => value as TeacherSalary);

    service = new SalaryService(
      users as unknown as Repository<User>,
      {} as never,
      {} as never,
      {} as never,
      salaries as unknown as Repository<TeacherSalary>,
      transactions as unknown as Repository<FinanceTransaction>,
      audit as never,
      { getSchoolId: () => null, getBranchId: () => null } as unknown as import('../src/common/tenant/tenant-context.service').TenantContextService,
    );
  });

  describe('adjust', () => {
    it('blocks adjusting an already approved salary', async () => {
      salaries.findOne.mockResolvedValue(makeSalary({ status: TeacherSalaryStatus.APPROVED }));
      await expect(
        service.adjust('sal-1', { adjustmentReason: 'test' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses adjusted amount as the final amount', async () => {
      salaries.findOne.mockResolvedValue(makeSalary());
      const row = await service.adjust('sal-1', {
        adjustedAmount: 700000,
        adjustmentReason: 'Qo‘shimcha darslar',
      });
      expect(row.finalAmount).toBe(700000);
      expect(row.adjustmentReason).toBe('Qo‘shimcha darslar');
    });

    it('computes final from adjusted lessons × rate when amount not given', async () => {
      salaries.findOne.mockResolvedValue(makeSalary({ ratePerLesson: 40000 }));
      const row = await service.adjust('sal-1', {
        adjustedLessons: 12,
        adjustmentReason: 'Tuzatish',
      });
      expect(row.finalAmount).toBe(480000);
      expect(row.completedLessons).toBe(12);
    });
  });

  describe('approve', () => {
    it('creates an expense transaction and marks the salary approved', async () => {
      salaries.findOne.mockResolvedValue(makeSalary({ finalAmount: 500000 }));
      users.findOne.mockResolvedValue(makeTeacher());

      const row = await service.approve('sal-1', { userId: 'mgr-1', username: 'manager' });

      expect(transactions.save).toHaveBeenCalledTimes(1);
      const tx = transactions.create.mock.calls[0][0];
      expect(tx).toMatchObject({
        type: 'expense',
        amount: 500000,
        personId: 'teacher-1',
        personRole: 'teacher',
        sourceType: 'teacher_salary',
        month: 5,
        year: 2026,
        note: 'Oylik maosh: 2026-05',
      });
      expect(row.status).toBe(TeacherSalaryStatus.APPROVED);
      expect(row.transactionId).toBe('tx-1');
    });

    it('does not write a transaction when the final amount is zero', async () => {
      salaries.findOne.mockResolvedValue(makeSalary({ finalAmount: 0 }));
      users.findOne.mockResolvedValue(makeTeacher());

      const row = await service.approve('sal-1');

      expect(transactions.save).not.toHaveBeenCalled();
      expect(row.status).toBe(TeacherSalaryStatus.APPROVED);
      expect(row.transactionId).toBeNull();
    });

    it('rejects approving an already approved salary', async () => {
      salaries.findOne.mockResolvedValue(makeSalary({ status: TeacherSalaryStatus.APPROVED }));
      await expect(service.approve('sal-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
