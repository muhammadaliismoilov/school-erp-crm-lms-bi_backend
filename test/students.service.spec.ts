import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { StudentsService } from '../src/modules/students/students.service';
import type { UsersService } from '../src/modules/users/users.service';
import type { StudentDocument } from '../src/modules/students/entities/student-document.entity';
import type { StudentParent } from '../src/modules/students/entities/student-parent.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { Gender, StudentStatus } from '../src/modules/students/enums/student-status.enum';

const emptyRepository = <T extends object>(): Repository<T> => ({}) as Repository<T>;

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

  beforeEach(() => {
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

    service = new StudentsService(
      students as unknown as Repository<Student>,
      studentParents as unknown as Repository<StudentParent>,
      emptyRepository<StudentDocument>(),
      {} as DataSource,
      usersService as unknown as UsersService,
      undefined,
    );
  });

  describe('getStats', () => {
    it('aggregates total, gender counts and new-this-month', async () => {
      students.count
        .mockResolvedValueOnce(120) // total
        .mockResolvedValueOnce(70) // male
        .mockResolvedValueOnce(50); // female
      students.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(8),
      } as never);

      const stats = await service.getStats();

      expect(stats).toEqual({ total: 120, male: 70, female: 50, newThisMonth: 8 });
      expect(students.count).toHaveBeenNthCalledWith(2, { where: { gender: Gender.MALE } });
      expect(students.count).toHaveBeenNthCalledWith(3, { where: { gender: Gender.FEMALE } });
    });
  });

  describe('removeStudent', () => {
    it('soft-removes an existing student and returns its id', async () => {
      const student = { id: studentId, status: StudentStatus.ACTIVE } as Student;
      students.findOne.mockResolvedValue(student);
      students.softRemove.mockResolvedValue(student as never);

      const result = await service.removeStudent(studentId);

      expect(students.softRemove).toHaveBeenCalledWith(student);
      expect(result).toEqual({ id: studentId });
    });

    it('persists the withdrawal reason before soft-removing', async () => {
      const student = { id: studentId, status: StudentStatus.ACTIVE } as Student;
      students.findOne.mockResolvedValue(student);
      students.save.mockImplementation(async (value) => value as Student);
      students.softRemove.mockResolvedValue(student as never);

      await service.removeStudent(studentId, '  Boshqa maktabga ko‘chdi  ');

      expect(student.withdrawalReason).toBe('Boshqa maktabga ko‘chdi');
      expect(students.save).toHaveBeenCalledWith(student);
      expect(students.softRemove).toHaveBeenCalledWith(student);
    });

    it('does not persist a blank reason', async () => {
      const student = { id: studentId, status: StudentStatus.ACTIVE } as Student;
      students.findOne.mockResolvedValue(student);
      students.softRemove.mockResolvedValue(student as never);

      await service.removeStudent(studentId, '   ');

      expect(students.save).not.toHaveBeenCalled();
      expect(students.softRemove).toHaveBeenCalledWith(student);
    });

    it('throws NotFound when the student does not exist', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(service.removeStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findDeparted', () => {
    it('filters soft-deleted students by gender and class with search', async () => {
      const qb = {
        withDeleted: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: studentId }], 1]),
      };
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
      const make = (n: number) => ({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(n),
      });
      students.createQueryBuilder
        .mockReturnValueOnce(make(12) as never)
        .mockReturnValueOnce(make(7) as never)
        .mockReturnValueOnce(make(5) as never);

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
      students.findOne.mockResolvedValue(student);
      students.save.mockImplementation(async (value) => value as Student);
      students.recover.mockResolvedValue(student as never);

      const result = await service.restoreStudent(studentId);

      expect(student.withdrawalReason).toBeNull();
      expect(students.recover).toHaveBeenCalledWith(student);
      expect(result).toEqual({ id: studentId });
    });

    it('throws BadRequest when the student is not departed', async () => {
      students.findOne.mockResolvedValue({ id: studentId, deletedAt: null } as Student);
      await expect(service.restoreStudent(studentId)).rejects.toBeInstanceOf(BadRequestException);
      expect(students.recover).not.toHaveBeenCalled();
    });

    it('throws NotFound when the student does not exist', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(service.restoreStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('permanentlyRemoveStudent', () => {
    it('hard-removes a departed student', async () => {
      const student = { id: studentId, deletedAt: new Date() } as unknown as Student;
      students.findOne.mockResolvedValue(student);
      students.remove.mockResolvedValue(student as never);

      const result = await service.permanentlyRemoveStudent(studentId);

      expect(students.remove).toHaveBeenCalledWith(student);
      expect(result).toEqual({ id: studentId });
    });

    it('refuses to hard-remove a student that is not departed', async () => {
      students.findOne.mockResolvedValue({ id: studentId, deletedAt: null } as Student);
      await expect(service.permanentlyRemoveStudent(studentId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(students.remove).not.toHaveBeenCalled();
    });
  });

  describe('updateStudent', () => {
    it('applies the patch but never persists guardian-only fields onto the entity', async () => {
      const student = { id: studentId, firstName: 'Ali', region: null } as Student;
      students.findOne.mockResolvedValue(student);
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
      students.findOne.mockResolvedValue({ id: studentId } as Student);
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
      students.findOne.mockResolvedValue({ id: studentId } as Student);
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
});
