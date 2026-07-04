import type { Repository } from 'typeorm';
import { StaffService } from '../src/modules/hr/staff.service';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import type { StaffSalaryHistory } from '../src/modules/hr/entities/staff-salary-history.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { Role } from '../src/modules/identity/entities/role.entity';
import type { UsersService } from '../src/modules/users/users.service';
import { EmploymentStatus } from '../src/modules/hr/enums/hr.enums';

function makeStaff(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'staff-1',
    employeeCode: 'EMP-0001',
    userId: 'user-1',
    firstName: 'Ali',
    lastName: 'Valiyev',
    hireDate: '2026-06-01',
    status: EmploymentStatus.ACTIVE,
    salary: 5000000,
    ...overrides,
  } as StaffMember;
}

describe('StaffService', () => {
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'count' | 'softDelete'>>;
  let history: jest.Mocked<Pick<Repository<StaffSalaryHistory>, 'create' | 'save' | 'find'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'findOne' | 'save' | 'softDelete'>>;
  let roles: jest.Mocked<Pick<Repository<Role>, 'findOne'>>;
  let teachers: { softDelete: jest.Mock };
  let usersService: { create: jest.Mock };
  let service: StaffService;
  const tenantCtx: { schoolId: string | null; branchId: string | null } = { schoolId: null, branchId: null };

  beforeEach(() => {
    tenantCtx.schoolId = null;
    tenantCtx.branchId = null;
    staff = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'staff-1', ...v })),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      softDelete: jest.fn(),
    };
    history = {
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => v),
      find: jest.fn().mockResolvedValue([]),
    };
    users = {
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    roles = { findOne: jest.fn() };
    usersService = {
      create: jest.fn().mockResolvedValue({ id: 'user-1', login: 'valiyev.ali', generatedPassword: 'St0ng-pass' }),
    };

    // Tenant kontekst — sozlanadigan (default: maktab/filial yo'q, scoping o'chiq).
    const tenant = { getSchoolId: () => tenantCtx.schoolId, getBranchId: () => tenantCtx.branchId };

    teachers = { softDelete: jest.fn().mockResolvedValue(undefined) };

    service = new StaffService(
      staff as unknown as Repository<StaffMember>,
      history as unknown as Repository<StaffSalaryHistory>,
      teachers as unknown as Repository<import('../src/modules/hr/entities/teacher.entity').Teacher>,
      users as unknown as Repository<User>,
      roles as unknown as Repository<Role>,
      usersService as unknown as UsersService,
      tenant as unknown as import('../src/common/tenant/tenant-context.service').TenantContextService,
    );
  });

  describe('createStaff', () => {
    it('creates a login user, an employee, an initial salary-history row and returns credentials', async () => {
      // 1-chaqiruv: employeeCode noyobligini tekshirish (null = bo'sh); 2-chaqiruv: getStaff.
      staff.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeStaff());

      const res = await service.createStaff({
        firstName: 'Ali',
        lastName: 'Valiyev',
        email: 'ali@example.uz',
        hireDate: '2026-06-01',
        salary: 5000000,
        roleName: 'accountant',
      });

      expect(usersService.create).toHaveBeenCalledTimes(1);
      expect(usersService.create.mock.calls[0][0].roleNames).toEqual(['accountant']);
      expect(staff.save).toHaveBeenCalledTimes(1);
      expect(history.save).toHaveBeenCalledTimes(1);
      expect(res.credentials).toEqual({ username: 'valiyev.ali', password: 'St0ng-pass' });
    });

    it('rolls back the created user if employee creation fails', async () => {
      staff.findOne.mockResolvedValueOnce(null);
      staff.save.mockRejectedValueOnce(new Error('db error'));

      await expect(
        service.createStaff({ firstName: 'Ali', lastName: 'Valiyev', hireDate: '2026-06-01' }),
      ).rejects.toThrow('db error');
      expect(users.softDelete).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateStaff', () => {
    it('records salary history when the salary changes', async () => {
      staff.findOne.mockResolvedValue(makeStaff({ salary: 5000000 }));
      users.findOne.mockResolvedValue(null);

      await service.updateStaff('staff-1', { salary: 6000000, salaryChangeReason: 'Oshirildi' });

      expect(history.save).toHaveBeenCalledTimes(1);
      const row = history.create.mock.calls[0][0];
      expect(row.oldSalary).toBe(5000000);
      expect(row.newSalary).toBe(6000000);
    });

    it('does not record salary history when the salary is unchanged', async () => {
      staff.findOne.mockResolvedValue(makeStaff({ salary: 5000000 }));
      users.findOne.mockResolvedValue(null);

      await service.updateStaff('staff-1', { phone: '+998901112233' });

      expect(history.save).not.toHaveBeenCalled();
    });
  });

  describe('tenant scoping (ko‘p-maktabli ajratish)', () => {
    it('getStaff — kontekstda maktab/filial bo‘lsa where‘ga qo‘shiladi', async () => {
      tenantCtx.schoolId = 'school-A';
      tenantCtx.branchId = 'branch-1';
      staff.findOne.mockResolvedValue(makeStaff());

      await service.getStaff('staff-1');

      const where = staff.findOne.mock.calls[0][0].where;
      expect(where).toMatchObject({ id: 'staff-1', schoolId: 'school-A', filialId: 'branch-1' });
    });

    it('getStaff — kontekst yo‘q bo‘lsa faqat id bo‘yicha (filtrsiz)', async () => {
      staff.findOne.mockResolvedValue(makeStaff());

      await service.getStaff('staff-1');

      const where = staff.findOne.mock.calls[0][0].where;
      expect(where).toEqual({ id: 'staff-1' });
    });

    it('findStaff — aktiv maktab bo‘yicha andWhere qo‘shadi', async () => {
      tenantCtx.schoolId = 'school-A';
      const qb: Record<string, jest.Mock> = {};
      for (const m of ['leftJoinAndSelect', 'leftJoinAndMapOne', 'where', 'andWhere', 'orderBy', 'skip', 'take']) {
        qb[m] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      staff.createQueryBuilder.mockReturnValue(qb as never);

      await service.findStaff({ page: 1, limit: 20 } as never);

      const schoolFilter = qb.andWhere.mock.calls.find((c) => String(c[0]).includes('school_id'));
      expect(schoolFilter).toBeDefined();
      expect(schoolFilter?.[1]).toMatchObject({ tenantSchoolId: 'school-A' });
    });

    it('createBareStaff — yangi xodimga kontekst maktab/filialini yozadi', async () => {
      tenantCtx.schoolId = 'school-A';
      tenantCtx.branchId = 'branch-1';

      const created = await service.createBareStaff({
        firstName: 'Aziz',
        lastName: 'Karimov',
        hireDate: '2026-06-01',
      });

      expect(created).toMatchObject({ schoolId: 'school-A', filialId: 'branch-1' });
    });
  });
});
