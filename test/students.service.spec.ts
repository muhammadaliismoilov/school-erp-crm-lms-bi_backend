import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { StudentsService } from '../src/modules/students/students.service';
import type { Parent } from '../src/modules/students/entities/parent.entity';
import type { StudentDocument } from '../src/modules/students/entities/student-document.entity';
import type { StudentParent } from '../src/modules/students/entities/student-parent.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { Gender, StudentStatus } from '../src/modules/students/enums/student-status.enum';

const emptyRepository = <T extends object>(): Repository<T> => ({}) as Repository<T>;

describe('StudentsService', () => {
  const studentId = 'b3c1f8a2-0000-4000-8000-000000000001';
  let students: jest.Mocked<
    Pick<Repository<Student>, 'count' | 'createQueryBuilder' | 'findOne' | 'save' | 'softRemove'>
  >;
  let service: StudentsService;

  beforeEach(() => {
    students = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    service = new StudentsService(
      students as unknown as Repository<Student>,
      emptyRepository<Parent>(),
      emptyRepository<StudentParent>(),
      emptyRepository<StudentDocument>(),
      {} as DataSource,
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

    it('throws NotFound when the student does not exist', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(service.removeStudent(studentId)).rejects.toBeInstanceOf(NotFoundException);
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
});
