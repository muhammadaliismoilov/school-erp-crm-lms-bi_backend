import type { Repository } from 'typeorm';
import { StudentReportService } from '../src/modules/students/student-report.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { StudentConclusion } from '../src/modules/students/entities/student-conclusion.entity';
import type { StudentSmartGoal } from '../src/modules/students/entities/student-smart-goal.entity';
import type { StudentsService } from '../src/modules/students/students.service';

describe('StudentReportService', () => {
  const studentId = 'c0ffee00-0000-4000-8000-000000000020';
  const currentYearId = 'year-current';

  let conclusions: jest.Mocked<Pick<Repository<StudentConclusion>, 'findOne' | 'create' | 'save'>>;
  let smartGoals: jest.Mocked<Pick<Repository<StudentSmartGoal>, 'findOne' | 'create' | 'save'>>;
  let academicYears: jest.Mocked<Pick<Repository<AcademicYear>, 'findOne'>>;
  let studentsService: jest.Mocked<Pick<StudentsService, 'findStudent'>>;
  let service: StudentReportService;

  beforeEach(() => {
    conclusions = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    smartGoals = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    academicYears = { findOne: jest.fn().mockResolvedValue({ id: currentYearId } as AcademicYear) };
    studentsService = { findStudent: jest.fn().mockResolvedValue({ id: studentId }) };

    service = new StudentReportService(
      conclusions as unknown as Repository<StudentConclusion>,
      smartGoals as unknown as Repository<StudentSmartGoal>,
      academicYears as unknown as Repository<AcademicYear>,
      studentsService as unknown as StudentsService,
      undefined,
    );
  });

  describe('upsertConclusion', () => {
    it('creates a new record under the current academic year and only sets provided fields', async () => {
      conclusions.findOne.mockResolvedValue(null);
      conclusions.create.mockImplementation((value) => value as StudentConclusion);
      conclusions.save.mockImplementation(async (value) => value as StudentConclusion);

      const saved = await service.upsertConclusion(studentId, { tutorNote: 'Yaxshi' });

      expect(academicYears.findOne).toHaveBeenCalledWith({ where: { isCurrent: true } });
      expect(conclusions.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentId, academicYearId: currentYearId }),
      );
      expect(saved.tutorNote).toBe('Yaxshi');
      // psychologistNote was not supplied → must stay undefined on the fresh entity
      expect(saved.psychologistNote).toBeUndefined();
    });
  });

  describe('upsertSmartGoals', () => {
    it('assigns ids to goals that arrive without one', async () => {
      smartGoals.findOne.mockResolvedValue(null);
      smartGoals.create.mockImplementation((value) => value as StudentSmartGoal);
      smartGoals.save.mockImplementation(async (value) => value as StudentSmartGoal);

      const saved = await service.upsertSmartGoals(studentId, {
        smartGoals: [{ title: 'Ingliz tilini o‘rganish' }],
      });

      expect(saved.smartGoals).toHaveLength(1);
      expect(saved.smartGoals[0].id).toEqual(expect.any(String));
      expect(saved.smartGoals[0].title).toBe('Ingliz tilini o‘rganish');
    });
  });
});
