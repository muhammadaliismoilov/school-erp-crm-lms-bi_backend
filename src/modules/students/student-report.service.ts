import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { AcademicYear } from "../academic/entities/academic-year.entity";
import {
  UpsertConclusionDto,
  UpsertSmartGoalsDto,
} from "./dto/student-report.dto";
import { StudentConclusion } from "./entities/student-conclusion.entity";
import { StudentSmartGoal, SmartGoalItem } from "./entities/student-smart-goal.entity";
import { StudentsService } from "./students.service";

@Injectable()
export class StudentReportService {
  private readonly logger = new Logger(StudentReportService.name);

  constructor(
    @InjectRepository(StudentConclusion)
    private readonly conclusions: Repository<StudentConclusion>,
    @InjectRepository(StudentSmartGoal)
    private readonly smartGoals: Repository<StudentSmartGoal>,
    @InjectRepository(AcademicYear)
    private readonly academicYears: Repository<AcademicYear>,
    private readonly studentsService: StudentsService,
    private readonly auditService?: AuditService,
  ) {}

  /** Aniq yil berilmasa joriy o‘quv yilini topadi. */
  private async resolveYearId(explicit?: string | null): Promise<string | null> {
    if (explicit) return explicit;
    const current = await this.academicYears.findOne({ where: { isCurrent: true } });
    return current?.id ?? null;
  }

  // ------------------------------------------------------------ Xulosalar

  async getConclusion(studentId: string, yearId?: string) {
    await this.studentsService.findStudent(studentId);
    const academicYearId = await this.resolveYearId(yearId);
    const existing = await this.conclusions.findOne({
      where: { studentId, academicYearId: academicYearId ?? IsNull() },
    });

    return (
      existing ?? {
        studentId,
        academicYearId,
        tutorNote: null,
        tutorMetrics: {},
        psychologistNote: null,
        psychMetrics: {},
      }
    );
  }

  async upsertConclusion(studentId: string, dto: UpsertConclusionDto) {
    await this.studentsService.findStudent(studentId);
    const academicYearId = await this.resolveYearId(dto.academicYearId);

    let entity = await this.conclusions.findOne({
      where: { studentId, academicYearId: academicYearId ?? IsNull() },
    });
    if (!entity) {
      entity = this.conclusions.create({ studentId, academicYearId });
    }

    if (dto.tutorNote !== undefined) entity.tutorNote = dto.tutorNote || null;
    if (dto.tutorMetrics !== undefined) entity.tutorMetrics = dto.tutorMetrics ?? {};
    if (dto.psychologistNote !== undefined) entity.psychologistNote = dto.psychologistNote || null;
    if (dto.psychMetrics !== undefined) entity.psychMetrics = dto.psychMetrics ?? {};

    const saved = await this.conclusions.save(entity);
    await this.audit("student.conclusion.upsert", studentId);
    return saved;
  }

  // ------------------------------------------------------------ Kelajak rejasi (SMART)

  async getSmartGoals(studentId: string, yearId?: string) {
    await this.studentsService.findStudent(studentId);
    const academicYearId = await this.resolveYearId(yearId);
    const existing = await this.smartGoals.findOne({
      where: { studentId, academicYearId: academicYearId ?? IsNull() },
    });

    return (
      existing ?? {
        studentId,
        academicYearId,
        characterNote: null,
        developmentNote: null,
        workNote: null,
        smartGoals: [] as SmartGoalItem[],
      }
    );
  }

  async upsertSmartGoals(studentId: string, dto: UpsertSmartGoalsDto) {
    await this.studentsService.findStudent(studentId);
    const academicYearId = await this.resolveYearId(dto.academicYearId);

    let entity = await this.smartGoals.findOne({
      where: { studentId, academicYearId: academicYearId ?? IsNull() },
    });
    if (!entity) {
      entity = this.smartGoals.create({ studentId, academicYearId });
    }

    if (dto.characterNote !== undefined) entity.characterNote = dto.characterNote || null;
    if (dto.developmentNote !== undefined) entity.developmentNote = dto.developmentNote || null;
    if (dto.workNote !== undefined) entity.workNote = dto.workNote || null;
    if (dto.smartGoals !== undefined) {
      entity.smartGoals = dto.smartGoals.map((g) => ({
        id: g.id || randomUUID(),
        title: g.title,
        deadline: g.deadline ?? null,
        result: g.result ?? null,
      }));
    }

    const saved = await this.smartGoals.save(entity);
    await this.audit("student.smartgoals.upsert", studentId);
    return saved;
  }

  // ------------------------------------------------------------ Helpers

  private async audit(action: string, entityId: string): Promise<void> {
    try {
      await this.auditService?.log({ action, entity: "student_report", entityId });
    } catch (error) {
      this.logger.warn(
        `Failed to write student report audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
