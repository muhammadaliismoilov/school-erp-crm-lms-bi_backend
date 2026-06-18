import type { Repository } from 'typeorm';
import { CrmService } from '../src/modules/crm/crm.service';
import type { Lead } from '../src/modules/crm/entities/lead.entity';
import type { LeadComment } from '../src/modules/crm/entities/lead-comment.entity';
import type { LeadSource } from '../src/modules/crm/entities/lead-source.entity';
import type { LeadTag } from '../src/modules/crm/entities/lead-tag.entity';
import type { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { LeadStatus } from '../src/modules/crm/enums/lead-status.enum';
import type { StudentsService } from '../src/modules/students/students.service';

const now = new Date('2026-06-17T10:00:00.000Z');

const lead = (over: Partial<Lead>): Lead =>
  ({
    id: 'x',
    firstName: 'N',
    phone: '+998900000000',
    status: LeadStatus.NEW,
    sourceId: null,
    assignedToId: null,
    enrolledStudentId: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  }) as Lead;

// Cohort: A=contract+enrolled, B=interested, C=new (no source/manager), D=rejected.
const cohort: Lead[] = [
  lead({ id: 'A', status: LeadStatus.CONTRACT, sourceId: 'S1', assignedToId: 'M1', enrolledStudentId: 'stu-1' }),
  lead({ id: 'B', status: LeadStatus.INTERESTED, sourceId: 'S1', assignedToId: 'M1' }),
  lead({ id: 'C', status: LeadStatus.NEW }),
  lead({ id: 'D', status: LeadStatus.REJECTED, sourceId: 'S2', assignedToId: 'M2' }),
];

const emptyQb = () => {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    'leftJoin',
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
  ]) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
};

describe('CrmService.getStatistics', () => {
  const build = () => {
    const leads = {
      find: jest.fn().mockResolvedValue(cohort),
      count: jest.fn().mockResolvedValue(10),
      createQueryBuilder: jest.fn(() => emptyQb()),
    };
    const sources = { find: jest.fn().mockResolvedValue([]) };
    const service = new CrmService(
      leads as unknown as Repository<Lead>,
      sources as unknown as Repository<LeadSource>,
      {} as unknown as Repository<LeadComment>,
      {} as unknown as Repository<LeadTag>,
      {} as unknown as StudentsService,
      undefined,
      undefined as unknown as Repository<AuditLog>,
    );
    return { service, leads };
  };

  it('computes overview totals and conversion from the cohort', async () => {
    const { service } = build();
    const stats = await service.getStatistics({});

    expect(stats.overview.totalLeads).toBe(10); // all-time count
    expect(stats.overview.newLeads).toBe(4); // cohort size
    expect(stats.overview.conversionRate).toBe(25); // 1 enrolled / 4
    expect(stats.overview.avgCycleDays).toBeNull(); // no audit repo
    expect(stats.overview.newLeadsDelta).toBeNull(); // no range → no previous period
  });

  it('builds a cumulative funnel excluding rejected leads', async () => {
    const { service } = build();
    const { stages, overallConversion } = (await service.getStatistics({})).funnel;

    const byStage = Object.fromEntries(stages.map((s) => [s.stage, s.count]));
    expect(byStage[LeadStatus.NEW]).toBe(3); // A,B,C reached new (D rejected excluded)
    expect(byStage[LeadStatus.CONTACTED]).toBe(2); // A,B
    expect(byStage[LeadStatus.INTERESTED]).toBe(2); // A,B
    expect(byStage[LeadStatus.TRIAL_LESSON]).toBe(1); // A
    expect(byStage[LeadStatus.CONTRACT]).toBe(1); // A
    expect(byStage.enrolled).toBe(1); // A enrolled
    expect(overallConversion).toBe(25);
    expect(stages[0].stepConversion).toBeNull();
  });

  it('reports rejection rate and zero stuck leads when activity is recent', async () => {
    const { service } = build();
    const q = (await service.getStatistics({})).quality;

    expect(q.rejectedCount).toBe(1);
    expect(q.rejectionRate).toBe(25);
    expect(q.stuckLeads).toBe(0);
    expect(q.stuckThresholdDays).toBe(7);
  });

  it('groups sources and managers with conversion', async () => {
    const { service } = build();
    const stats = await service.getStatistics({});

    const s1 = stats.sources.find((s) => s.sourceId === 'S1');
    expect(s1).toMatchObject({ count: 2, converted: 1, conversion: 50 });
    const noSource = stats.sources.find((s) => s.sourceId === null);
    expect(noSource?.count).toBe(1);

    const m1 = stats.managers.find((m) => m.userId === 'M1');
    expect(m1).toMatchObject({ count: 2, converted: 1, conversion: 50, open: 1, closed: 1 });
    expect(m1?.avgResponseHours).toBeNull();
  });

  it('computes previous-period deltas when a range is supplied', async () => {
    const leads = {
      find: jest.fn().mockResolvedValue(cohort),
      // totalLeads, then previousPeriod total + converted
      count: jest
        .fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0),
      createQueryBuilder: jest.fn(() => emptyQb()),
    };
    const sources = { find: jest.fn().mockResolvedValue([]) };
    const service = new CrmService(
      leads as unknown as Repository<Lead>,
      sources as unknown as Repository<LeadSource>,
      {} as unknown as Repository<LeadComment>,
      {} as unknown as Repository<LeadTag>,
      {} as unknown as StudentsService,
      undefined,
      undefined as unknown as Repository<AuditLog>,
    );

    const stats = await service.getStatistics({
      from: '2026-06-10T00:00:00.000Z',
      to: '2026-06-17T00:00:00.000Z',
    });

    // newLeads 4 vs prev 2 → +100%
    expect(stats.overview.newLeadsDelta).toBe(100);
    expect(stats.range.from).toBe('2026-06-10T00:00:00.000Z');
  });
});
