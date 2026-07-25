import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ProjectService } from '../src/modules/hr/project.service';
import type { Project } from '../src/modules/hr/entities/project.entity';
import { ProjectStatus } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'pr-1',
    name: 'Darsla',
    description: null,
    color: '#f59e0b',
    status: ProjectStatus.ACTIVE,
    tasks: [],
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Project;
}

describe('ProjectService', () => {
  let projects: jest.Mocked<
    Pick<Repository<Project>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete' | 'find'>
  >;
  let service: ProjectService;

  beforeEach(() => {
    projects = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'pr-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      find: jest.fn(),
    };
    service = new ProjectService(projects as unknown as Repository<Project>, new TenantContextService());
  });

  describe('createProject', () => {
    it('keeps the color and defaults to active', async () => {
      projects.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeProject());
      const res = await service.createProject({ name: 'Darsla', color: '#f59e0b' });
      expect(res.color).toBe('#f59e0b');
      expect(res.status).toBe(ProjectStatus.ACTIVE);
    });

    it('rejects a duplicate name', async () => {
      projects.findOne.mockResolvedValue(makeProject());
      await expect(service.createProject({ name: 'Darsla' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getProject', () => {
    it('throws when the project is missing', async () => {
      projects.findOne.mockResolvedValue(null);
      await expect(service.getProject('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
