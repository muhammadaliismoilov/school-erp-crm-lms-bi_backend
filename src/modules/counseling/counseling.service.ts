import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../identity/entities/user.entity";
import { Student } from "../students/entities/student.entity";
import { EncryptionService } from "../../common/security/encryption.service";
import { TenantContextService } from "../../common/tenant/tenant-context.service";
import { tenantWhere } from "../../common/tenant/tenant-scope.util";
import {
  CreateCounselingSessionDto,
  UpdateCounselingSessionDto,
} from "./dto/counseling.dto";
import { CounselingSession } from "./entities/counseling-session.entity";

/** Session metadata without the confidential notes — safe for list views. */
export interface CounselingSessionSummary {
  id: string;
  studentId: string;
  studentName: string | null;
  counselorId: string;
  counselorName: string | null;
  sessionDate: string;
  sessionType: string;
  riskLevel?: string | null;
  followUpDate?: string | null;
  createdAt: Date;
}

/** Full session with decrypted notes — only returned through detail endpoints. */
export interface CounselingSessionDetail extends CounselingSessionSummary {
  notes: string;
}

@Injectable()
export class CounselingService {
  constructor(
    @InjectRepository(CounselingSession)
    private readonly sessions: Repository<CounselingSession>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly encryption: EncryptionService,
    private readonly tenant: TenantContextService,
  ) {}

  async create(
    dto: CreateCounselingSessionDto,
  ): Promise<CounselingSessionDetail> {
    const { notes, ...rest } = dto;
    const entity = this.sessions.create({
      ...rest,
      notesEncrypted: this.encryption.encrypt(notes),
    });
    const saved = await this.sessions.save(entity);
    const [names] = await this.resolveNames([saved]);
    return { ...this.toDetail(saved), ...names };
  }

  async update(
    id: string,
    dto: UpdateCounselingSessionDto,
  ): Promise<CounselingSessionDetail> {
    const entity = await this.sessions.findOne({ where: tenantWhere<CounselingSession>(this.tenant, { id }, { branch: true }) });
    if (!entity) {
      throw new NotFoundException("CounselingSession not found");
    }
    const { notes, ...rest } = dto;
    Object.assign(entity, rest);
    if (notes !== undefined) {
      entity.notesEncrypted = this.encryption.encrypt(notes);
    }
    const saved = await this.sessions.save(entity);
    const [names] = await this.resolveNames([saved]);
    return { ...this.toDetail(saved), ...names };
  }

  async findAll(): Promise<CounselingSessionSummary[]> {
    const rows = await this.sessions.find({ where: tenantWhere<CounselingSession>(this.tenant, {}, { branch: true }), order: { sessionDate: "DESC" } });
    return this.toSummaries(rows);
  }

  async findByStudent(
    studentId: string,
  ): Promise<CounselingSessionSummary[]> {
    const rows = await this.sessions.find({
      where: tenantWhere<CounselingSession>(this.tenant, { studentId }, { branch: true }),
      order: { sessionDate: "DESC" },
    });
    return this.toSummaries(rows);
  }

  async findOne(id: string): Promise<CounselingSessionDetail> {
    const entity = await this.sessions.findOne({ where: tenantWhere<CounselingSession>(this.tenant, { id }, { branch: true }) });
    if (!entity) {
      throw new NotFoundException("CounselingSession not found");
    }
    const [names] = await this.resolveNames([entity]);
    return { ...this.toDetail(entity), ...names };
  }

  /**
   * `studentId`/`counselorId` — UUID, ekranda foydasiz. Ism resolutsiyasi
   * xuddi `ClassLeaderAssignmentResponse` dagi kabi SERVERDA qilinadi (bitta
   * joyda, bitta manba) — frontend N+1 qidiruv qilmasin.
   */
  private async toSummaries(
    rows: CounselingSession[],
  ): Promise<CounselingSessionSummary[]> {
    const namesByRow = await this.resolveNames(rows);
    return rows.map((row, index) => ({ ...this.toSummary(row), ...namesByRow[index] }));
  }

  private async resolveNames(
    rows: CounselingSession[],
  ): Promise<{ studentName: string | null; counselorName: string | null }[]> {
    const studentIds = [...new Set(rows.map((row) => row.studentId))];
    const counselorIds = [...new Set(rows.map((row) => row.counselorId))];

    const [students, counselors] = await Promise.all([
      studentIds.length
        ? this.students.find({ where: { id: In(studentIds) }, select: { id: true, firstName: true, lastName: true } })
        : [],
      counselorIds.length
        ? this.users.find({ where: { id: In(counselorIds) }, select: { id: true, firstName: true, lastName: true } })
        : [],
    ]);

    const studentNames = new Map(students.map((s) => [s.id, `${s.lastName} ${s.firstName}`.trim()]));
    const counselorNames = new Map(counselors.map((u) => [u.id, `${u.lastName} ${u.firstName}`.trim()]));

    return rows.map((row) => ({
      studentName: studentNames.get(row.studentId) ?? null,
      counselorName: counselorNames.get(row.counselorId) ?? null,
    }));
  }

  private toSummary(entity: CounselingSession): Omit<CounselingSessionSummary, "studentName" | "counselorName"> {
    return {
      id: entity.id,
      studentId: entity.studentId,
      counselorId: entity.counselorId,
      sessionDate: entity.sessionDate,
      sessionType: entity.sessionType,
      riskLevel: entity.riskLevel,
      followUpDate: entity.followUpDate,
      createdAt: entity.createdAt,
    };
  }

  private toDetail(entity: CounselingSession): Omit<CounselingSessionDetail, "studentName" | "counselorName"> {
    return {
      ...this.toSummary(entity),
      notes: this.encryption.decrypt(entity.notesEncrypted),
    };
  }
}
