import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EncryptionService } from "../../common/security/encryption.service";
import {
  CreateCounselingSessionDto,
  UpdateCounselingSessionDto,
} from "./dto/counseling.dto";
import { CounselingSession } from "./entities/counseling-session.entity";

/** Session metadata without the confidential notes — safe for list views. */
export interface CounselingSessionSummary {
  id: string;
  studentId: string;
  counselorId: string;
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
    private readonly encryption: EncryptionService,
  ) {}

  async create(
    dto: CreateCounselingSessionDto,
  ): Promise<CounselingSessionDetail> {
    const { notes, ...rest } = dto;
    const entity = this.sessions.create({
      ...rest,
      notesEncrypted: this.encryption.encrypt(notes),
    });
    return this.toDetail(await this.sessions.save(entity));
  }

  async update(
    id: string,
    dto: UpdateCounselingSessionDto,
  ): Promise<CounselingSessionDetail> {
    const entity = await this.sessions.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException("CounselingSession not found");
    }
    const { notes, ...rest } = dto;
    Object.assign(entity, rest);
    if (notes !== undefined) {
      entity.notesEncrypted = this.encryption.encrypt(notes);
    }
    return this.toDetail(await this.sessions.save(entity));
  }

  async findAll(): Promise<CounselingSessionSummary[]> {
    const rows = await this.sessions.find({ order: { sessionDate: "DESC" } });
    return rows.map((row) => this.toSummary(row));
  }

  async findByStudent(
    studentId: string,
  ): Promise<CounselingSessionSummary[]> {
    const rows = await this.sessions.find({
      where: { studentId },
      order: { sessionDate: "DESC" },
    });
    return rows.map((row) => this.toSummary(row));
  }

  async findOne(id: string): Promise<CounselingSessionDetail> {
    const entity = await this.sessions.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException("CounselingSession not found");
    }
    return this.toDetail(entity);
  }

  private toSummary(entity: CounselingSession): CounselingSessionSummary {
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

  private toDetail(entity: CounselingSession): CounselingSessionDetail {
    return {
      ...this.toSummary(entity),
      notes: this.encryption.decrypt(entity.notesEncrypted),
    };
  }
}
