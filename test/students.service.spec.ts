import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { StudentsService } from '../src/modules/students/students.service';
import type { UsersService } from '../src/modules/users/users.service';
import type { StudentDocument } from '../src/modules/students/entities/student-document.entity';
import type { StudentParent } from '../src/modules/students/entities/student-parent.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { Gender, StudentStatus } from '../src/modules/students/enums/student-status.enum';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';
import type { AccessScopeService } from '../src/common/scope/access-scope.service';
import type { OwnScope } from '../src/common/scope/data-scope.enum';

const emptyRepository = <T extends object>(): Repository<T> => ({}) as Repository<T>;

/** `where`/`andWhere` chaqiruvlarini yozib boruvchi QueryBuilder taqlidi. */
interface QbResult {
  one?: unknown;
  count?: number;
  manyAndCount?: [unknown[], number];
}

interface RecordedCondition {
  sql: string;
  params?: Record<string, unknown>;
}

interface FakeQb {
  conditions: RecordedCondition[];
  withDeleted: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  getOne: jest.Mock;
  getCount: jest.Mock;
  getManyAndCount: jest.Mock;
}

function makeQb(result: QbResult = {}): FakeQb {
  const conditions: RecordedCondition[] = [];
  const qb = { conditions } as FakeQb;
  const chain = jest.fn(() => qb);
  const record = jest.fn((sql: string, params?: Record<string, unknown>) => {
    conditions.push({ sql, params });
    return qb;
  });

  qb.withDeleted = chain;
  qb.leftJoinAndSelect = chain;
  qb.orderBy = chain;
  qb.skip = chain;
  qb.take = chain;
  qb.where = record;
  qb.andWhere = record;
  qb.getOne = jest.fn().mockResolvedValue(result.one ?? null);
  qb.getCount = jest.fn().mockResolvedValue(result.count ?? 0);
  qb.getManyAndCount = jest.fn().mockResolvedValue(result.manyAndCount ?? [[], 0]);
  return qb;
}

/** Shartlar ro'yxatida berilgan SQL bo'lakchasi bormi. */
const hasCondition = (qb: FakeQb, fragment: string): boolean =>
  qb.conditions.some((condition) => condition.sql.includes(fragment));

describe('StudentsService', () => {
  const studentId = 'b3c1f8a2-0000-4000-8000-000000000001';
  const parentId = 'b3c1f8a2-0000-4000-8000-0000000000a1';
  let students: jest.Mocked<
    Pick<
      Repository<Student>,
      'count' | 'createQueryBuilder' | 'findOne' | 'save' | 'softRemove' | 'recover' | 'remove'
    >
  >;
  let studentParents: jest.Mocked<
    Pick<Repository<StudentParent>, 'find' | 'findOne' | 'create' | 'save' | 'remove'>
  >;
  let usersService: jest.Mocked<Pick<UsersService, 'createParent' | 'findParentUser'>>;
  let service: StudentsService;
  let accessScope: { isRestricted: jest.Mock; resolveOwnScope: jest.Mock };
  const tenantCtx: { schoolId: string | null; branchId: string | null } = { schoolId: null, branchId: null };

  beforeEach(() => {
    tenantCtx.schoolId = null;
    tenantCtx.branchId = null;
    students = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      recover: jest.fn(),
      remove: jest.fn(),
    };
    studentParents = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    usersService = {
      createParent: jest.fn(),
      findParentUser: jest.fn(),
    };

    // Tenant kontekst — sozlanadigan (default: maktab/filial yo'q, scoping o'chiq).
    const tenant = { getSchoolId: () => tenantCtx.schoolId, getBranchId: () => tenantCtx.branchId };

    // Egalik doirasi — default: chegaralanmagan (`ALL`), eski xulq saqlanadi.
    accessScope = {
      isRestricted: jest.fn().mockReturnValue(false),
      resolveOwnScope: jest.fn().mockResolvedValue({ classIds: [], studentIds: [] }),
    };

    service = new StudentsService(
      students as unknown as Repository<Student>,
      studentParents as unknown as Repository<StudentParent>,
      emptyRepository<StudentDocument>(),
      {} as DataSource,
      usersService as unknown as UsersService,
      tenant as unknown as TenantContextService,
      accessScope as unknown as AccessScopeService,
      undefined,
    );
  });

  /** Doirani `OWN` ga o'tkazib, berilgan egalik ro'yxatini beradi. */
  const restrictTo = (own: OwnScope) => {
    accessScope.isRestricted.mockReturnValue(true);
    accessScope.resolveOwnScope.mockResolvedValue(own);
  };

  describe('getStats', () => {
    it('aggregates total, gender counts and new-this-month', async () => {
      const [total, male, female, fresh] = [
        makeQb({ count: 120 }),
        makeQb({ count: 70 }),
        makeQb({ count: 50 }),
        makeQb({ count: 8 }),
      ];
      students.createQueryBuilder
        .mockReturnValueOnce(total as never)
        .mockReturnValueOnce(male as never)
        .mockReturnValueOnce(female as never)
        .mockReturnValueOnce(fresh as never);

      const stats = await service.getStats();

      expect(stats).toEqual({ total: 120, male: 70, female: 50, newThisMonth: 8 });
      expect(hasCondition(male, 'student.gender')).toBe(true);
      expect(hasCondition(fresh, 'student.created_at')).toBe(true);
    });

    it("doira `OWN` bo'lsa kartochka raqamlari ham chegaralanadi", async () => {
      restrictTo({ classIds: ['c1'], studentIds: [] });
      const qbs = [makeQb(), makeQb(), makeQb(), makeQb()];
      qbs.forEach((qb) => students.createQueryBuilder.mockReturnValueOnce(qb as never));

      await service.getStats();

      // Har bir hisob so'rovi egalik shartini oladi — aks holda o'qituvchi
      // 12 ta o'quvchi ko'rib turib "jami 640" raqamini o'qigan bo'lardi.
      for (const qb of qbs) {
        expect(hasCondition(qb, 'student.current_class_id IN')).toBe(true);
      }
    });
  });

  describe('removeStudent', () => {
    it('soft-removes an existing student and returns its id', async () => {
      const student = { id: studentId, status: StudentStatus.ACTIVE } as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      students.softRemove.mockResolvedValue(student as never);

      const result = await service.removeStudent(studentId);

      expect(students.softRemove).toHaveBeenCalledWith(student);
      expect(result).toEqual({ id: studentId });
    });

    it('persists the withdrawal reason before soft-removing', async () => {
      const student = { id: studentId, status: StudentStatus.ACTIVE } as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      students.save.mockImplementation(async (value) => value as Student);
      students.softRemove.mockResolvedValue(student as never);

      await service.removeStudent(studentId, '  Boshqa maktabga ko‘chdi  ');

      expect(student.withdrawalReason).toBe('Boshqa maktabga ko‘chdi');
      expect(students.save).toHaveBeenCalledWith(student);
      expect(students.softRemove).toHaveBeenCalledWith(student);
    });

    it('does not persist a blank reason', async () => {
      const student = { id: studentId, status: StudentStatus.ACTIVE } as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      students.softRemove.mockResolvedValue(student as never);

      await service.removeStudent(studentId, '   ');

      expect(students.save).not.toHaveBeenCalled();
      expect(students.softRemove).toHaveBeenCalledWith(student);
    });

    it('throws NotFound when the student does not exist', async () => {
      students.createQueryBuilder.mockReturnValue(makeQb({ one: null }) as never);
      await expect(service.removeStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findDeparted', () => {
    it('filters soft-deleted students by gender and class with search', async () => {
      const qb = makeQb({ manyAndCount: [[{ id: studentId }], 1] });
      students.createQueryBuilder.mockReturnValue(qb as never);

      const page = await service.findDeparted({
        page: 1,
        limit: 30,
        gender: Gender.MALE,
        classId: 'c1',
        search: 'ali',
      } as never);

      expect(qb.withDeleted).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('student.deleted_at IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('student.gender = :gender', { gender: Gender.MALE });
      expect(qb.andWhere).toHaveBeenCalledWith('student.current_class_id = :classId', {
        classId: 'c1',
      });
      expect(page.meta.total).toBe(1);
    });
  });

  describe('getDepartedStats', () => {
    it('counts departed students by gender', async () => {
      students.createQueryBuilder
        .mockReturnValueOnce(makeQb({ count: 12 }) as never)
        .mockReturnValueOnce(makeQb({ count: 7 }) as never)
        .mockReturnValueOnce(makeQb({ count: 5 }) as never);

      const stats = await service.getDepartedStats();

      expect(stats).toEqual({ total: 12, male: 7, female: 5 });
    });
  });

  describe('restoreStudent', () => {
    it('recovers a departed student and clears the reason', async () => {
      const student = {
        id: studentId,
        deletedAt: new Date(),
        withdrawalReason: 'x',
      } as unknown as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      students.save.mockImplementation(async (value) => value as Student);
      students.recover.mockResolvedValue(student as never);

      const result = await service.restoreStudent(studentId);

      expect(student.withdrawalReason).toBeNull();
      expect(students.recover).toHaveBeenCalledWith(student);
      expect(result).toEqual({ id: studentId });
    });

    it('throws BadRequest when the student is not departed', async () => {
      const student = { id: studentId, deletedAt: null } as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      await expect(service.restoreStudent(studentId)).rejects.toBeInstanceOf(BadRequestException);
      expect(students.recover).not.toHaveBeenCalled();
    });

    it('throws NotFound when the student does not exist', async () => {
      students.createQueryBuilder.mockReturnValue(makeQb({ one: null }) as never);
      await expect(service.restoreStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("doiradan tashqaridagi ketgan o'quvchini tiklab bo'lmaydi", async () => {
      restrictTo({ classIds: ['c1'], studentIds: [] });
      const qb = makeQb({ one: null });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await expect(service.restoreStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
      expect(hasCondition(qb, 'student.current_class_id IN')).toBe(true);
    });
  });

  describe('permanentlyRemoveStudent', () => {
    it('hard-removes a departed student', async () => {
      const student = { id: studentId, deletedAt: new Date() } as unknown as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      students.remove.mockResolvedValue(student as never);

      const result = await service.permanentlyRemoveStudent(studentId);

      expect(students.remove).toHaveBeenCalledWith(student);
      expect(result).toEqual({ id: studentId });
    });

    it('refuses to hard-remove a student that is not departed', async () => {
      const alive = { id: studentId, deletedAt: null } as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: alive }) as never);
      await expect(service.permanentlyRemoveStudent(studentId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(students.remove).not.toHaveBeenCalled();
    });
  });

  describe('updateStudent', () => {
    it('applies the patch but never persists guardian-only fields onto the entity', async () => {
      const student = { id: studentId, firstName: 'Ali', region: null } as Student;
      students.createQueryBuilder.mockReturnValue(makeQb({ one: student }) as never);
      students.save.mockImplementation(async (value) => value as Student);

      const saved = await service.updateStudent(studentId, {
        region: 'Toshkent',
        guardianFullName: 'Valiyev Akmal',
        guardianPhone: '+998901112233',
      });

      expect(saved.region).toBe('Toshkent');
      expect(saved as unknown as Record<string, unknown>).not.toHaveProperty('guardianFullName');
      expect(saved as unknown as Record<string, unknown>).not.toHaveProperty('guardianPhone');
    });
  });

  describe('createParent', () => {
    it('provisions a PARENT user via UsersService and returns it', async () => {
      const created = { id: parentId, firstName: 'Dilshod', generatedPassword: 'secret' };
      usersService.createParent.mockResolvedValue(created as never);

      const result = await service.createParent({
        firstName: 'Dilshod',
        lastName: 'Valiyev',
        phone: '+998901234567',
      } as never);

      expect(usersService.createParent).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Dilshod', phone: '+998901234567' }),
      );
      expect(result).toBe(created);
    });
  });

  describe('linkParent', () => {
    it('validates the parent user then creates the link', async () => {
      students.createQueryBuilder.mockReturnValue(
        makeQb({ one: { id: studentId } as Student }) as never,
      );
      usersService.findParentUser.mockResolvedValue({ id: parentId } as never);
      studentParents.findOne.mockResolvedValue(null);
      studentParents.create.mockImplementation((value) => value as never);
      studentParents.save.mockImplementation(async (value) => value as never);

      const link = await service.linkParent(studentId, {
        parentId,
        relation: 'father',
        isPrimary: true,
      });

      expect(usersService.findParentUser).toHaveBeenCalledWith(parentId);
      expect(link).toMatchObject({ studentId, parentId, relation: 'father', isPrimary: true });
    });

    it('propagates the error when the user is not a PARENT', async () => {
      students.createQueryBuilder.mockReturnValue(
        makeQb({ one: { id: studentId } as Student }) as never,
      );
      usersService.findParentUser.mockRejectedValue(new BadRequestException());

      await expect(
        service.linkParent(studentId, { parentId, relation: 'father' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(studentParents.save).not.toHaveBeenCalled();
    });
  });

  describe('unlinkParent', () => {
    it('removes an existing link', async () => {
      const link = { id: 'l1', studentId, parentId } as StudentParent;
      studentParents.findOne.mockResolvedValue(link);
      studentParents.remove.mockResolvedValue(link as never);

      const result = await service.unlinkParent(studentId, parentId);

      expect(studentParents.remove).toHaveBeenCalledWith(link);
      expect(result).toEqual({ id: parentId });
    });

    it('throws NotFound when the link does not exist', async () => {
      studentParents.findOne.mockResolvedValue(null);
      await expect(service.unlinkParent(studentId, parentId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('childrenByParents', () => {
    it('returns an empty map for no ids without hitting the database', async () => {
      const result = await service.childrenByParents([]);
      expect(result).toEqual({});
      expect(studentParents.find).not.toHaveBeenCalled();
    });

    it('groups linked students by parent id', async () => {
      studentParents.find.mockResolvedValue([
        { parentId, student: { id: 's1' } },
        { parentId, student: { id: 's2' } },
        { parentId: 'p2', student: { id: 's3' } },
      ] as never);

      const map = await service.childrenByParents([parentId, 'p2']);

      expect(map[parentId]).toHaveLength(2);
      expect(map['p2']).toHaveLength(1);
    });
  });

  describe('tenant scoping (ko‘p-maktabli ajratish)', () => {
    it('findStudent — kontekstda maktab/filial bo‘lsa so‘rovga qo‘shiladi', async () => {
      tenantCtx.schoolId = 'school-A';
      tenantCtx.branchId = 'branch-1';
      const qb = makeQb({ one: { id: studentId } as Student });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await service.findStudent(studentId);

      expect(hasCondition(qb, 'student.school_id = :tenantSchoolId')).toBe(true);
      expect(hasCondition(qb, 'student.filial_id = :tenantBranchId')).toBe(true);
    });

    it('findStudent — kontekst yo‘q bo‘lsa faqat id bo‘yicha', async () => {
      const qb = makeQb({ one: { id: studentId } as Student });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await service.findStudent(studentId);

      expect(qb.conditions).toEqual([{ sql: 'student.id = :id', params: { id: studentId } }]);
    });
  });

  describe('qator darajasidagi egalik (data scope)', () => {
    it("doira `ALL` — egalik sharti umuman qo'shilmaydi (eski xulq)", async () => {
      const qb = makeQb({ manyAndCount: [[], 0] });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await service.findStudents({ page: 1, limit: 20 } as never);

      expect(accessScope.resolveOwnScope).not.toHaveBeenCalled();
      expect(hasCondition(qb, 'ownScope')).toBe(false);
    });

    it("doira `OWN` — o'z sinflari VA o'z farzandlari OR bilan birlashadi", async () => {
      restrictTo({ classIds: ['c1', 'c2'], studentIds: ['s9'] });
      const qb = makeQb({ manyAndCount: [[], 0] });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await service.findStudents({ page: 1, limit: 20 } as never);

      const ownership = qb.conditions.find((condition) => condition.sql.includes('ownScope'));
      expect(ownership?.sql).toContain('student.current_class_id IN');
      expect(ownership?.sql).toContain('student.id IN');
      expect(ownership?.sql).toContain(' OR ');
      expect(Object.values(ownership?.params ?? {})).toEqual([['c1', 'c2'], ['s9']]);
    });

    it("egalik bo'sh — HECH NARSA qaytmaydi (filtr tashlab yuborilmaydi)", async () => {
      restrictTo({ classIds: [], studentIds: [] });
      const qb = makeQb({ manyAndCount: [[], 0] });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await service.findStudents({ page: 1, limit: 20 } as never);

      expect(hasCondition(qb, '1 = 0')).toBe(true);
    });

    it("doiradan tashqaridagi o'quvchi uchun 404 (403 emas — mavjudlik oshkor bo'lmasin)", async () => {
      restrictTo({ classIds: ['c1'], studentIds: [] });
      const qb = makeQb({ one: null });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await expect(service.findStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
      expect(hasCondition(qb, 'student.current_class_id IN')).toBe(true);
    });

    it("tahrirlash ham egalik orqali o'tadi (findStudent'ga tayanadi)", async () => {
      restrictTo({ classIds: ['c1'], studentIds: [] });
      students.createQueryBuilder.mockReturnValue(makeQb({ one: null }) as never);

      await expect(
        service.updateStudent(studentId, { region: 'Toshkent' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(students.save).not.toHaveBeenCalled();
    });

    it('ketganlar ro‘yxati ham chegaralanadi', async () => {
      restrictTo({ classIds: ['c1'], studentIds: [] });
      const qb = makeQb({ manyAndCount: [[], 0] });
      students.createQueryBuilder.mockReturnValue(qb as never);

      await service.findDeparted({ page: 1, limit: 20 } as never);

      expect(hasCondition(qb, 'student.current_class_id IN')).toBe(true);
    });
  });
});
