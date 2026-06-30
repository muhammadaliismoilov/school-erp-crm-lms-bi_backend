import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateProjectDto, CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './dto/task.dto';
import { Project } from './entities/project.entity';
import { StaffMember } from './entities/staff-member.entity';
import { Task } from './entities/task.entity';
import { TaskPriority, TaskStatus } from './enums/hr.enums';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskListResult {
  items: TaskResponse[];
  meta: PageMeta;
}

export interface ProjectOption {
  id: string;
  name: string;
}

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
  ) {}

  async findTasks(query: TaskQueryDto): Promise<TaskListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.project', 'project')
      .leftJoinAndSelect('t.assignee', 'assignee')
      .where('t.deleted_at IS NULL');

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.projectId) qb.andWhere('t.project_id = :pid', { pid: query.projectId });
    if (query.assigneeId) qb.andWhere('t.assignee_id = :aid', { aid: query.assigneeId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('t.title ILIKE :q', { q: `%${search}%` }).orWhere('t.description ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((t) => this.toResponse(t)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getTask(id: string): Promise<TaskResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createTask(dto: CreateTaskDto): Promise<TaskResponse> {
    await this.assertProject(dto.projectId);
    await this.assertAssignee(dto.assigneeId);

    const entity = await this.tasks.save(
      this.tasks.create({
        title: dto.title.trim(),
        description: this.nullableText(dto.description),
        projectId: dto.projectId ?? null,
        assigneeId: dto.assigneeId ?? null,
        status: dto.status ?? TaskStatus.PENDING,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
      }),
    );
    return this.getTask(entity.id);
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<TaskResponse> {
    const entity = await this.findEntity(id);
    await this.assertProject(dto.projectId);
    await this.assertAssignee(dto.assigneeId);

    if (dto.title !== undefined) entity.title = dto.title.trim();
    if (dto.description !== undefined) entity.description = this.nullableText(dto.description);
    if (dto.projectId !== undefined) entity.projectId = dto.projectId ?? null;
    if (dto.assigneeId !== undefined) entity.assigneeId = dto.assigneeId ?? null;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.priority !== undefined) entity.priority = dto.priority;
    if (dto.startDate !== undefined) entity.startDate = dto.startDate ?? null;
    if (dto.endDate !== undefined) entity.endDate = dto.endDate ?? null;

    await this.tasks.save(entity);
    return this.getTask(entity.id);
  }

  async removeTask(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.tasks.softDelete(entity.id);
  }

  // ─── Loyihalar (minimal — Vazifa dropdown'i uchun) ──────────────────────

  async projectOptions(): Promise<ProjectOption[]> {
    const rows = await this.projects.find({ order: { createdAt: 'DESC' } });
    return rows.map((p) => ({ id: p.id, name: p.name }));
  }

  async createProject(dto: CreateProjectDto): Promise<ProjectOption> {
    const entity = await this.projects.save(
      this.projects.create({ name: dto.name.trim(), description: this.nullableText(dto.description) }),
    );
    return { id: entity.id, name: entity.name };
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Task> {
    const entity = await this.tasks.findOne({ where: { id }, relations: { project: true, assignee: true } });
    if (!entity) throw new NotFoundException('Vazifa topilmadi');
    return entity;
  }

  private async assertProject(projectId?: string): Promise<void> {
    if (!projectId) return;
    const exists = await this.projects.findOne({ where: { id: projectId } });
    if (!exists) throw new NotFoundException('Loyiha topilmadi');
  }

  private async assertAssignee(assigneeId?: string): Promise<void> {
    if (!assigneeId) return;
    const exists = await this.staff.findOne({ where: { id: assigneeId } });
    if (!exists) throw new NotFoundException('Ijrochi (xodim) topilmadi');
  }

  private toResponse(t: Task): TaskResponse {
    const assigneeName = t.assignee
      ? `${t.assignee.lastName ?? ''} ${t.assignee.firstName ?? ''}`.trim() || null
      : null;
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      projectId: t.projectId ?? null,
      projectName: t.project?.name ?? null,
      assigneeId: t.assigneeId ?? null,
      assigneeName,
      status: t.status,
      priority: t.priority,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
