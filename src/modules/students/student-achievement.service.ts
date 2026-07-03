import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import {
  CreateAchievementDto,
  QueryAchievementsDto,
  UpdateAchievementDto,
} from "./dto/achievement.dto";
import { StudentAchievement } from "./entities/student-achievement.entity";
import { AchievementRank } from "./enums/achievement.enum";
import { StudentsService } from "./students.service";
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface AchievementStats {
  total: number;
  first: number;
  second: number;
  third: number;
}

@Injectable()
export class StudentAchievementService {
  private readonly logger = new Logger(StudentAchievementService.name);

  constructor(
    @InjectRepository(StudentAchievement)
    private readonly achievements: Repository<StudentAchievement>,
    private readonly studentsService: StudentsService,
    private readonly tenant: TenantContextService,
    private readonly auditService?: AuditService,
  ) {}

  async list(studentId: string, query: QueryAchievementsDto): Promise<StudentAchievement[]> {
    await this.studentsService.findStudent(studentId);
    return this.achievements.find({
      where: {
        studentId,
        ...(query.category ? { category: query.category } : {}),
      },
      order: { achievedAt: "DESC", createdAt: "DESC" },
    });
  }

  async stats(studentId: string): Promise<AchievementStats> {
    await this.studentsService.findStudent(studentId);
    const all = await this.achievements.find({ where: { studentId } });
    return {
      total: all.length,
      first: all.filter((a) => a.rank === AchievementRank.FIRST).length,
      second: all.filter((a) => a.rank === AchievementRank.SECOND).length,
      third: all.filter((a) => a.rank === AchievementRank.THIRD).length,
    };
  }

  async create(studentId: string, dto: CreateAchievementDto): Promise<StudentAchievement> {
    await this.studentsService.findStudent(studentId);
    const saved = await this.achievements.save(
      this.achievements.create({ ...dto, studentId }),
    );
    await this.audit("student.achievement.create", studentId, { id: saved.id });
    return saved;
  }

  async update(
    studentId: string,
    id: string,
    dto: UpdateAchievementDto,
  ): Promise<StudentAchievement> {
    const achievement = await this.findOne(studentId, id);
    Object.assign(achievement, dto);
    const saved = await this.achievements.save(achievement);
    await this.audit("student.achievement.update", studentId, { id });
    return saved;
  }

  async remove(studentId: string, id: string): Promise<{ id: string }> {
    const achievement = await this.findOne(studentId, id);
    await this.achievements.softRemove(achievement);
    await this.audit("student.achievement.delete", studentId, { id });
    return { id };
  }

  private async findOne(studentId: string, id: string): Promise<StudentAchievement> {
    const achievement = await this.achievements.findOne({ where: tenantWhere<StudentAchievement>(this.tenant, { id, studentId }, { branch: true }) });
    if (!achievement) {
      throw new NotFoundException("Achievement not found");
    }
    return achievement;
  }

  private async audit(
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService?.log({ action, entity: "student_achievement", entityId, details });
    } catch (error) {
      this.logger.warn(
        `Failed to write achievement audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
