import type { Repository } from 'typeorm';
import { HrStatsService } from '../src/modules/hr/hr-stats.service';
import { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { StaffLeave } from '../src/modules/hr/entities/staff-leave.entity';
import { AttendanceRecord } from '../src/modules/hr/entities/attendance-record.entity';
import { Vacancy } from '../src/modules/hr/entities/vacancy.entity';
import { Candidate } from '../src/modules/hr/entities/candidate.entity';
import { Interaction } from '../src/modules/hr/entities/interaction.entity';
import { Task } from '../src/modules/hr/entities/task.entity';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

/**
 * `getCount` uchun ketma-ket qiymatlar qaytaruvchi query-builder mock. Har chaqiruv
 * navbatdagi sonni beradi; `getRawOne` esa distinct sanoq ({ c }) qaytaradi.
 */
function repoWithCounts(counts: number[], raw: number[] = []): Repository<any> {
  let countIdx = 0;
  let rawIdx = 0;
  const qb: any = {
    where: () => qb,
    andWhere: () => qb,
    select: () => qb,
    getCount: jest.fn(async () => counts[countIdx++] ?? 0),
    getRawOne: jest.fn(async () => ({ c: String(raw[rawIdx++] ?? 0) })),
  };
  return { createQueryBuilder: jest.fn(() => qb) } as unknown as Repository<any>;
}

describe('HrStatsService', () => {
  it('aggregates every section and computes the attendance rate', async () => {
    // staff: total=10, active=8, newThisMonth=2  (getCount tartibida)
    const staff = repoWithCounts([10, 8, 2]);
    // leaves: onLeaveToday distinct = 3 (getRawOne)
    const leaves = repoWithCounts([], [3]);
    // attendance: presentToday distinct = 6 (getRawOne)
    const attendance = repoWithCounts([], [6]);
    // vacancies: open = 1
    const vacancies = repoWithCounts([1]);
    // candidates: active=4, hiredThisMonth=1
    const candidates = repoWithCounts([4, 1]);
    // interactions: total=5, completed=2
    const interactions = repoWithCounts([5, 2]);
    // tasks: total=7, done=3
    const tasks = repoWithCounts([7, 3]);

    const service = new HrStatsService(
      staff as Repository<StaffMember>,
      leaves as Repository<StaffLeave>,
      attendance as Repository<AttendanceRecord>,
      vacancies as Repository<Vacancy>,
      candidates as Repository<Candidate>,
      interactions as Repository<Interaction>,
      tasks as Repository<Task>,
      new TenantContextService(),
    );

    const res = await service.overview();

    expect(res.staff).toEqual({ total: 10, active: 8, onLeaveToday: 3, newThisMonth: 2 });
    // rate = round(6 / 8 * 100) = 75
    expect(res.attendance).toEqual({ presentToday: 6, activeStaff: 8, rate: 75 });
    expect(res.recruitment).toEqual({ openVacancies: 1, activeCandidates: 4, hiredThisMonth: 1 });
    expect(res.interactions).toEqual({ total: 5, completed: 2 });
    expect(res.tasks).toEqual({ total: 7, done: 3 });
  });

  it('returns rate 0 when there are no active staff (no division by zero)', async () => {
    const service = new HrStatsService(
      repoWithCounts([0, 0, 0]) as Repository<StaffMember>,
      repoWithCounts([], [0]) as Repository<StaffLeave>,
      repoWithCounts([], [0]) as Repository<AttendanceRecord>,
      repoWithCounts([0]) as Repository<Vacancy>,
      repoWithCounts([0, 0]) as Repository<Candidate>,
      repoWithCounts([0, 0]) as Repository<Interaction>,
      repoWithCounts([0, 0]) as Repository<Task>,
      new TenantContextService(),
    );

    const res = await service.overview();
    expect(res.attendance.rate).toBe(0);
  });
});
