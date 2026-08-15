import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ClassLeaderService } from '../src/modules/hr/class-leader.service';
import type { ClassLeaderAssignment } from '../src/modules/hr/entities/class-leader-assignment.entity';
import type { Teacher } from '../src/modules/hr/entities/teacher.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { PayrollConfigService } from '../src/modules/hr/payroll-config.service';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';

/** Zanjirli QueryBuilder mock. */
function makeQb(result: { many?: unknown[]; count?: number }) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['where', 'andWhere', 'orderBy', 'leftJoinAndSelect']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(result.many ?? []);
  qb.getCount = jest.fn().mockResolvedValue(result.count ?? 0);
  return qb;
}

describe('ClassLeaderService', () => {
  let assignments: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
  };
  let teachers: { findOne: jest.Mock };
  let classes: { findOne: jest.Mock };
  let config: { currentSettings: jest.Mock };
  let service: ClassLeaderService;

  const tenant = { getSchoolId: () => null, getBranchId: () => null } as unknown as TenantContextService;

  const savedAssignment = {
    id: 'a-1',
    teacherId: 't-1',
    classId: 'c-1',
    startDate: '2026-09-01',
    endDate: null,
    note: null,
    createdAt: new Date(),
    teacher: { staffMember: { lastName: 'Aliyeva', firstName: 'Nodira' } },
    schoolClass: { name: '5-A' },
  };

  beforeEach(() => {
    assignments = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ ...v, id: 'a-1' })),
      findOne: jest.fn().mockResolvedValue(savedAssignment),
      softDelete: jest.fn(),
    };
    teachers = { findOne: jest.fn().mockResolvedValue({ id: 't-1' }) };
    classes = { findOne: jest.fn().mockResolvedValue({ id: 'c-1', name: '5-A' }) };
    config = { currentSettings: jest.fn().mockResolvedValue({ classLeaderRate: 600000, maxClassLeaderships: 3 }) };
    service = new ClassLeaderService(
      assignments as unknown as Repository<ClassLeaderAssignment>,
      teachers as unknown as Repository<Teacher>,
      classes as unknown as Repository<SchoolClass>,
      config as unknown as PayrollConfigService,
      tenant,
    );
  });

  it('assign — sinfda davr kesishsa BadRequest', async () => {
    assignments.createQueryBuilder.mockReturnValue(makeQb({ count: 1 })); // sinf kesishuvi
    await expect(
      service.assign({ teacherId: 't-1', classId: 'c-1', startDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("assign — o'qituvchi limiti (3) to'lgan bo'lsa BadRequest", async () => {
    assignments.createQueryBuilder
      .mockReturnValueOnce(makeQb({ count: 0 })) // sinf bo'sh
      .mockReturnValueOnce(makeQb({ count: 3 })); // o'qituvchida 3 ta faol
    const error = await service
      .assign({ teacherId: 't-1', classId: 'c-1', startDate: '2026-09-01' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    // GlobalExceptionFilter faqat {uz,ru,en} obyektini o'zgarishsiz o'tkazadi —
    // oddiy satr bo'lsa umumiy xabarga almashtiriladi (T-05 da topilgan xato).
    const body = (error as BadRequestException).getResponse() as { message: { uz: string } };
    expect(body.message.uz).toMatch(/3 ta sinfga/);
  });

  it('assign — hammasi joyida bo‘lsa saqlaydi (teacherName/className bilan)', async () => {
    assignments.createQueryBuilder.mockReturnValue(makeQb({ count: 0 }));
    const res = await service.assign({ teacherId: 't-1', classId: 'c-1', startDate: '2026-09-01' });
    expect(assignments.save).toHaveBeenCalled();
    expect(res.teacherName).toBe('Aliyeva Nodira');
    expect(res.className).toBe('5-A');
  });

  it('assign — endDate < startDate bo‘lsa BadRequest', async () => {
    await expect(
      service.assign({ teacherId: 't-1', classId: 'c-1', startDate: '2026-09-10', endDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("assign — o'qituvchi topilmasa NotFound", async () => {
    teachers.findOne.mockResolvedValue(null);
    await expect(
      service.assign({ teacherId: 'yo-q', classId: 'c-1', startDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update — endDate qo‘yib rahbarlikni yopadi (almashtirish oqimi)', async () => {
    const res = await service.update('a-1', { endDate: '2026-12-15' });
    expect(assignments.save).toHaveBeenCalled();
    expect(res.id).toBe('a-1');
  });
});
