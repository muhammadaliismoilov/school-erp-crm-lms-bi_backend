import type { Repository } from 'typeorm';
import { AppPermission } from '../src/common/constants/permissions';
import { DashboardOverviewService } from '../src/modules/analytics/dashboard-overview.service';
import type { AuthenticatedUser } from '../src/common/security/authenticated-user.interface';
import type { Student } from '../src/modules/students/entities/student.entity';
import type { AttendanceRecord } from '../src/modules/attendance/entities/attendance-record.entity';
import type { ClassSession } from '../src/modules/attendance/entities/class-session.entity';
import type { Lead } from '../src/modules/crm/entities/lead.entity';
import type { Payroll } from '../src/modules/hr/entities/payroll.entity';
import type { StaffCertificate } from '../src/modules/hr/entities/staff-certificate.entity';
import type { StudentPayment } from '../src/modules/student-payments/entities/student-payment.entity';
import type { Branch } from '../src/modules/settings/entities/branch.entity';
import type { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import type { DebtsService } from '../src/modules/student-payments/debts.service';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';

/** Zanjirlanadigan (chainable) soxta QueryBuilder — oxirgi bajaruvchi metod berilgan natijani qaytaradi. */
function fakeQueryBuilder(result: Record<string, unknown> | Array<Record<string, unknown>>) {
  const qb: Record<string, jest.Mock> = {};
  const chain = ['select', 'addSelect', 'where', 'andWhere', 'groupBy', 'addGroupBy', 'orderBy', 'setParameters', 'leftJoin', 'limit'];
  for (const method of chain) qb[method] = jest.fn(() => qb);
  qb.getRawOne = jest.fn(async () => result);
  qb.getRawMany = jest.fn(async () => (Array.isArray(result) ? result : [result]));
  qb.getCount = jest.fn(async () => (typeof result === 'number' ? result : 0));
  return qb;
}

const user: AuthenticatedUser = {
  id: 'u-1',
  username: 'director',
  roles: ['director'],
  permissions: [AppPermission.ATTENDANCE_RECORDS_READ],
  schoolId: 'school-1',
};

function buildService(sessionsRow: Record<string, string>): DashboardOverviewService {
  const sessions = { createQueryBuilder: jest.fn(() => fakeQueryBuilder(sessionsRow)) };
  const attendance = { createQueryBuilder: jest.fn(() => fakeQueryBuilder([])) };
  const students = { count: jest.fn(async () => 0) };
  const empty = {
    createQueryBuilder: jest.fn(() => fakeQueryBuilder([])),
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
  };
  const tenant = { getSchoolId: () => 'school-1', getBranchId: () => null };

  return new DashboardOverviewService(
    students as unknown as Repository<Student>,
    attendance as unknown as Repository<AttendanceRecord>,
    sessions as unknown as Repository<ClassSession>,
    empty as unknown as Repository<Lead>,
    empty as unknown as Repository<Payroll>,
    empty as unknown as Repository<StaffCertificate>,
    empty as unknown as Repository<StudentPayment>,
    empty as unknown as Repository<Branch>,
    empty as unknown as Repository<AuditLog>,
    { getOverview: jest.fn() } as unknown as DebtsService,
    tenant as unknown as TenantContextService,
  );
}

describe('DashboardOverviewService — sessiyalar (birlashtirilgan so‘rov)', () => {
  it('bitta so‘rovdan sessionsToday va unconfirmed_sessions ikkalasini ham chiqaradi', async () => {
    const service = buildService({ confirmed: '5', cancelled: '1', pending: '2', unconfirmed: '3' });
    const result = await service.overview(user);

    expect(result.sessionsToday).toEqual({ total: 8, confirmed: 5, cancelled: 1, pending: 2 });
    expect(result.actionCenter).toContainEqual({ key: 'unconfirmed_sessions', count: 3 });
  });

  it('unconfirmed 0 bo‘lsa diqqat markaziga qo‘shilmaydi', async () => {
    const service = buildService({ confirmed: '0', cancelled: '0', pending: '0', unconfirmed: '0' });
    const result = await service.overview(user);
    expect(result.actionCenter.find((a) => a.key === 'unconfirmed_sessions')).toBeUndefined();
  });
});
