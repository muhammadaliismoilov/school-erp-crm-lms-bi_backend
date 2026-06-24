import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { pickLocalizedText } from '../../common/i18n/locale';
import { AuditService } from '../audit/audit.service';
import { NotificationChannel } from '../notifications/enums/notification-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { Student } from '../students/entities/student.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { CreateGradeRequestDto } from './dto/create-grade-request.dto';
import { GradeRequestQueryDto } from './dto/grade-request-query.dto';
import { ReviewGradeRequestDto } from './dto/review-grade-request.dto';
import { UpdateGradeRequestDto } from './dto/update-grade-request.dto';
import {
  GradeChangeRequest,
  GradeRequestKind,
  GradeRequestStatus,
} from './entities/grade-change-request.entity';
import {
  GradeRequestListResponseSchema,
  GradeRequestResponseSchema,
} from './swagger/grade-request-response.schema';

/** Who performed the action — audit trail va atributsiya uchun. */
export interface GradeRequestActor {
  userId?: string;
  ipAddress?: string;
}

const REVIEW_STATUSES: readonly GradeRequestStatus[] = [
  GradeRequestStatus.APPROVED,
  GradeRequestStatus.REJECTED,
];

@Injectable()
export class GradeRequestsService {
  private readonly logger = new Logger(GradeRequestsService.name);

  constructor(
    @InjectRepository(GradeChangeRequest)
    private readonly requests: Repository<GradeChangeRequest>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(Quarter)
    private readonly quarters: Repository<Quarter>,
    @InjectRepository(JournalEntry)
    private readonly journal: Repository<JournalEntry>,
    @InjectRepository(QuarterSubjectGrade)
    private readonly quarterGrades: Repository<QuarterSubjectGrade>,
    @InjectRepository(ExamResult)
    private readonly examResults: Repository<ExamResult>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateGradeRequestDto, actor?: GradeRequestActor): Promise<GradeRequestResponseSchema> {
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new NotFoundException('O‘quvchi topilmadi');
    }
    if (dto.subjectId) {
      const subject = await this.subjects.findOne({ where: { id: dto.subjectId } });
      if (!subject) {
        throw new NotFoundException('Fan topilmadi');
      }
    }
    if (dto.kind === GradeRequestKind.QUARTER && !dto.quarterId) {
      throw new BadRequestException('Choraklik baho so‘rovi uchun chorak majburiy');
    }
    if (dto.quarterId) {
      const quarter = await this.quarters.findOne({ where: { id: dto.quarterId } });
      if (!quarter) {
        throw new NotFoundException('Chorak topilmadi');
      }
    }

    const entity = await this.requests.save(
      this.requests.create({
        kind: dto.kind,
        studentId: dto.studentId,
        subjectId: dto.subjectId ?? null,
        quarterId: dto.quarterId ?? null,
        targetEntityId: dto.targetEntityId ?? null,
        currentGrade: dto.currentGrade ?? null,
        requestedGrade: dto.requestedGrade,
        reason: this.normalizeText(dto.reason),
        status: GradeRequestStatus.PENDING,
        requestedById: actor?.userId ?? null,
        applied: false,
      }),
    );

    await this.recordAudit(actor?.userId, 'grade_request.created', entity.id, {
      kind: entity.kind,
      studentId: entity.studentId,
    }, actor?.ipAddress);

    return this.findOne(entity.id);
  }

  async findAll(query: Partial<GradeRequestQueryDto> = {}): Promise<GradeRequestListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.nullableText(query.search);

    const qb = this.requests
      .createQueryBuilder('gcr')
      .leftJoinAndSelect('gcr.student', 'student')
      .leftJoinAndSelect('gcr.subject', 'subject');

    if (query.kind) {
      qb.andWhere('gcr.kind = :kind', { kind: query.kind });
    }
    if (query.status) {
      qb.andWhere('gcr.status = :status', { status: query.status });
    }
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('student.first_name ILIKE :s', { s: `%${search}%` })
            .orWhere('student.last_name ILIKE :s', { s: `%${search}%` })
            .orWhere('subject.normalized_name ILIKE :s', { s: `%${search}%` })
            .orWhere('gcr.reason ILIKE :s', { s: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('gcr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const pageCount = Math.ceil(total / limit) || 1;
    const stats = await this.computeStats(query.kind);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      meta: { page, limit, total, pageCount },
      stats,
    };
  }

  /** Stat kartalar joriy tab (kind) bo'yicha holatlar bo'yicha sanaladi. */
  private async computeStats(kind?: GradeRequestKind) {
    const base = () => {
      const qb = this.requests.createQueryBuilder('gcr');
      if (kind) {
        qb.where('gcr.kind = :kind', { kind });
      }
      return qb;
    };
    const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      base().getCount(),
      base().andWhere('gcr.status = :st', { st: GradeRequestStatus.PENDING }).getCount(),
      base().andWhere('gcr.status = :st', { st: GradeRequestStatus.APPROVED }).getCount(),
      base().andWhere('gcr.status = :st', { st: GradeRequestStatus.REJECTED }).getCount(),
    ]);
    return { totalCount, pendingCount, approvedCount, rejectedCount };
  }

  async findOne(id: string): Promise<GradeRequestResponseSchema> {
    return this.toResponseDto(await this.findEntity(id));
  }

  async update(id: string, dto: UpdateGradeRequestDto, actor?: GradeRequestActor): Promise<GradeRequestResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Kamida bitta maydon yuborilishi kerak');
    }
    const entity = await this.findEntity(id);
    if (entity.status !== GradeRequestStatus.PENDING) {
      throw new BadRequestException('Faqat "kutilmoqda" holatidagi so‘rovni tahrirlash mumkin');
    }

    if (dto.subjectId !== undefined) {
      if (dto.subjectId) {
        const subject = await this.subjects.findOne({ where: { id: dto.subjectId } });
        if (!subject) throw new NotFoundException('Fan topilmadi');
      }
      entity.subjectId = dto.subjectId ?? null;
    }
    if (dto.quarterId !== undefined) {
      if (dto.quarterId) {
        const quarter = await this.quarters.findOne({ where: { id: dto.quarterId } });
        if (!quarter) throw new NotFoundException('Chorak topilmadi');
      }
      entity.quarterId = dto.quarterId ?? null;
    }
    if (dto.currentGrade !== undefined) entity.currentGrade = dto.currentGrade;
    if (dto.requestedGrade !== undefined) entity.requestedGrade = dto.requestedGrade;
    if (dto.reason !== undefined) entity.reason = this.normalizeText(dto.reason);

    await this.requests.save(entity);
    await this.recordAudit(actor?.userId, 'grade_request.updated', entity.id, {
      changed: Object.keys(dto),
    }, actor?.ipAddress);
    return this.findOne(entity.id);
  }

  /** Tasdiqlash yoki rad etish. Tasdiqlashda asosiy baho yozuvi yangilanadi. */
  async review(id: string, dto: ReviewGradeRequestDto, actor?: GradeRequestActor): Promise<GradeRequestResponseSchema> {
    if (!REVIEW_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Holat approved yoki rejected bo‘lishi kerak');
    }
    const entity = await this.findEntity(id);
    if (entity.status !== GradeRequestStatus.PENDING) {
      throw new BadRequestException('So‘rov allaqachon ko‘rib chiqilgan');
    }

    if (dto.status === GradeRequestStatus.REJECTED) {
      const note = dto.reviewNote ? this.normalizeText(dto.reviewNote) : '';
      if (note.length < 3) {
        throw new BadRequestException('Rad etish uchun izoh majburiy');
      }
      entity.reviewNote = note;
    } else {
      entity.reviewNote = dto.reviewNote ? this.normalizeText(dto.reviewNote) : null;
      entity.applied = await this.applyGradeChange(entity);
    }

    entity.status = dto.status;
    entity.reviewedById = actor?.userId ?? null;
    entity.reviewedAt = new Date();
    await this.requests.save(entity);

    await this.recordAudit(actor?.userId, `grade_request.${dto.status}`, entity.id, {
      kind: entity.kind,
      applied: entity.applied,
    }, actor?.ipAddress);
    await this.notifyRequester(entity);

    return this.findOne(entity.id);
  }

  async remove(id: string, actor?: GradeRequestActor): Promise<void> {
    const entity = await this.findEntity(id);
    await this.requests.softDelete(id);
    await this.recordAudit(actor?.userId, 'grade_request.archived', entity.id, undefined, actor?.ipAddress);
  }

  /**
   * Tasdiqlangan so'rovni asosiy baho yozuviga qo'llaydi.
   * targetEntityId bo'lmasa qo'llanmaydi (applied=false qaytadi).
   */
  private async applyGradeChange(entity: GradeChangeRequest): Promise<boolean> {
    if (!entity.targetEntityId) {
      return false;
    }
    // numeric ustun PG'dan string sifatida kelishi mumkin — songa o'tkazamiz.
    const value = Number(entity.requestedGrade);

    if (entity.kind === GradeRequestKind.ASSESSMENT) {
      const row = await this.journal.findOne({ where: { id: entity.targetEntityId } });
      if (!row) throw new BadRequestException('Jurnal baho yozuvi topilmadi');
      this.assignFivePointOrBall(row, value);
      await this.journal.save(row);
      return true;
    }

    if (entity.kind === GradeRequestKind.QUARTER) {
      const row = await this.quarterGrades.findOne({ where: { id: entity.targetEntityId } });
      if (!row) throw new BadRequestException('Choraklik baho yozuvi topilmadi');
      this.assignFivePointOrBall(row, value);
      await this.quarterGrades.save(row);
      return true;
    }

    // COURSE → imtihon natijasi (score, 0–100 numeric).
    const row = await this.examResults.findOne({ where: { id: entity.targetEntityId } });
    if (!row) throw new BadRequestException('Imtihon natijasi topilmadi');
    row.score = value;
    await this.examResults.save(row);
    return true;
  }

  /** 5 ballik (≤5) bo'lsa grade, aks holda 100 ballik (ball) maydoniga yozadi. */
  private assignFivePointOrBall(row: { grade?: number | null; ball?: number | null }, value: number): void {
    if (value <= 5) {
      row.grade = Math.round(value);
    } else {
      row.ball = Math.round(value);
    }
  }

  private async findEntity(id: string): Promise<GradeChangeRequest> {
    const entity = await this.requests.findOne({
      where: { id },
      relations: { student: true, subject: true },
    });
    if (!entity) {
      throw new NotFoundException('Baho o‘zgartirish so‘rovi topilmadi');
    }
    return entity;
  }

  private async notifyRequester(entity: GradeChangeRequest): Promise<void> {
    if (!entity.requestedById) return;
    const verb = entity.status === GradeRequestStatus.APPROVED ? 'tasdiqlandi' : 'rad etildi';
    try {
      await this.notificationsService.queueNotification({
        recipientType: 'user',
        recipientId: entity.requestedById,
        channel: NotificationChannel.PUSH,
        payload: {
          gradeRequestId: entity.id,
          kind: entity.kind,
          status: entity.status,
          text: `Baho o‘zgartirish so‘rovingiz ${verb}`,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to queue grade request notification: ${this.errorMessage(error)}`);
    }
  }

  private async recordAudit(
    userId: string | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.auditService.log({ userId, action, entity: 'grade_change_request', entityId, ipAddress, details });
    } catch (error) {
      this.logger.warn(`Failed to write grade request audit log: ${this.errorMessage(error)}`);
    }
  }

  private toResponseDto(entity: GradeChangeRequest): GradeRequestResponseSchema {
    const student = entity.student;
    const studentName = student ? `${student.lastName} ${student.firstName}`.trim() : null;
    const subjectName = entity.subject?.name ? pickLocalizedText(entity.subject.name, 'uz') : null;

    return {
      id: entity.id,
      kind: entity.kind,
      studentId: entity.studentId,
      studentName,
      subjectId: entity.subjectId ?? null,
      subjectName,
      quarterId: entity.quarterId ?? null,
      targetEntityId: entity.targetEntityId ?? null,
      currentGrade: this.toNumber(entity.currentGrade),
      requestedGrade: this.toNumber(entity.requestedGrade) ?? 0,
      reason: entity.reason,
      status: entity.status,
      requestedById: entity.requestedById ?? null,
      reviewedById: entity.reviewedById ?? null,
      reviewedAt: entity.reviewedAt ?? null,
      reviewNote: entity.reviewNote ?? null,
      applied: entity.applied,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? null,
      version: entity.version,
    };
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = this.normalizeText(value);
    return n.length > 0 ? n : null;
  }
}
