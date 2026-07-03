import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { StudentAchievementService } from '../src/modules/students/student-achievement.service';
import type { StudentAchievement } from '../src/modules/students/entities/student-achievement.entity';
import {
  AchievementCategory,
  AchievementRank,
} from '../src/modules/students/enums/achievement.enum';
import type { StudentsService } from '../src/modules/students/students.service';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

describe('StudentAchievementService', () => {
  const studentId = 'a1b2c3d4-0000-4000-8000-000000000010';
  let repo: jest.Mocked<
    Pick<Repository<StudentAchievement>, 'find' | 'findOne' | 'create' | 'save' | 'softRemove'>
  >;
  let studentsService: jest.Mocked<Pick<StudentsService, 'findStudent'>>;
  let service: StudentAchievementService;

  const make = (rank: AchievementRank): StudentAchievement =>
    ({ rank, category: AchievementCategory.OLYMPIAD }) as StudentAchievement;

  beforeEach(() => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };
    studentsService = { findStudent: jest.fn().mockResolvedValue({ id: studentId }) };

    service = new StudentAchievementService(
      repo as unknown as Repository<StudentAchievement>,
      studentsService as unknown as StudentsService,
      new TenantContextService(),
      undefined,
    );
  });

  describe('stats', () => {
    it('counts total and medals by rank', async () => {
      repo.find.mockResolvedValue([
        make(AchievementRank.FIRST),
        make(AchievementRank.FIRST),
        make(AchievementRank.SECOND),
        make(AchievementRank.THIRD),
        make(AchievementRank.PARTICIPATION),
      ]);

      const stats = await service.stats(studentId);

      expect(stats).toEqual({ total: 5, first: 2, second: 1, third: 1 });
    });
  });

  describe('create', () => {
    it('attaches the studentId and persists the achievement', async () => {
      repo.create.mockImplementation((value) => value as StudentAchievement);
      repo.save.mockImplementation(async (value) => ({ id: 'ach-1', ...value }) as StudentAchievement);

      const result = await service.create(studentId, {
        title: 'Matematika olimpiadasi',
        category: AchievementCategory.OLYMPIAD,
        rank: AchievementRank.FIRST,
      });

      expect(studentsService.findStudent).toHaveBeenCalledWith(studentId);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ studentId }));
      expect(result.id).toBe('ach-1');
    });
  });

  describe('remove', () => {
    it('throws NotFound when the achievement is missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(studentId, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
