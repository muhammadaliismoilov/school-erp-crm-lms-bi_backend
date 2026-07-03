import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TaskService } from '../src/modules/hr/task.service';
import { Task } from '../src/modules/hr/entities/task.entity';
import type { Project } from '../src/modules/hr/entities/project.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { TaskPriority, TaskStatus } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Hujjat tayyorlash',
    description: null,
    projectId: null,
    assigneeId: null,
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    startDate: null,
    endDate: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Task;
}

describe('TaskService', () => {
  let tasks: jest.Mocked<Pick<Repository<Task>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let projects: jest.Mocked<Pick<Repository<Project>, 'find' | 'findOne' | 'create' | 'save'>>;
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne'>>;
  let service: TaskService;

  beforeEach(() => {
    tasks = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'task-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    projects = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    staff = { findOne: jest.fn() };
    service = new TaskService(
      tasks as unknown as Repository<Task>,
      projects as unknown as Repository<Project>,
      staff as unknown as Repository<StaffMember>,
      new TenantContextService(),
    );
  });

  describe('createTask', () => {
    it('creates a task with defaults and resolves the assignee name', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      tasks.findOne.mockResolvedValue(
        makeTask({ assigneeId: 'staff-1', assignee: { firstName: 'Ali', lastName: 'Valiyev' } as StaffMember }),
      );

      const res = await service.createTask({ title: 'Yangi vazifa', assigneeId: 'staff-1' });

      const created = tasks.create.mock.calls[0][0];
      expect(created.status).toBe(TaskStatus.PENDING);
      expect(created.priority).toBe(TaskPriority.MEDIUM);
      expect(res.assigneeName).toBe('Valiyev Ali');
    });

    it('rejects an unknown project', async () => {
      projects.findOne.mockResolvedValue(null);
      await expect(
        service.createTask({ title: 'X', projectId: '11111111-1111-1111-1111-111111111111' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown assignee', async () => {
      staff.findOne.mockResolvedValue(null);
      await expect(
        service.createTask({ title: 'X', assigneeId: '22222222-2222-2222-2222-222222222222' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeTask', () => {
    it('soft-deletes the task', async () => {
      tasks.findOne.mockResolvedValue(makeTask());
      await service.removeTask('task-1');
      expect(tasks.softDelete).toHaveBeenCalledWith('task-1');
    });
  });
});
