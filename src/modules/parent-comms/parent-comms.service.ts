import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { CreateParentCommDto } from './dto/create-parent-comm.dto';
import { ParentCommQueryDto } from './dto/parent-comm-query.dto';
import { UpdateParentCommDto } from './dto/update-parent-comm.dto';
import {
  CommunicationSentiment,
  ParentCommunication,
} from './entities/parent-communication.entity';
import {
  ParentCommListResponseSchema,
  ParentCommResponseSchema,
} from './swagger/parent-comm-response.schema';

/** Who performed the action — audit trail + XODIM atributsiyasi. */
export interface ParentCommActor {
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class ParentCommsService {
  private readonly logger = new Logger(ParentCommsService.name);

  constructor(
    @InjectRepository(ParentCommunication)
    private readonly comms: Repository<ParentCommunication>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(SchoolClass)
    private readonly classes: Repository<SchoolClass>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateParentCommDto, actor?: ParentCommActor): Promise<ParentCommResponseSchema> {
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new NotFoundException('O‘quvchi topilmadi');
    }
    if (dto.classId) {
      const cls = await this.classes.findOne({ where: { id: dto.classId } });
      if (!cls) {
        throw new NotFoundException('Sinf topilmadi');
      }
    }

    const entity = await this.comms.save(
      this.comms.create({
        studentId: dto.studentId,
        classId: dto.classId ?? student.currentClassId ?? null,
        parentId: dto.parentId ?? null,
        parentType: dto.parentType,
        sentiment: dto.sentiment,
        tutorId: dto.tutorId ?? null,
        createdById: actor?.userId ?? null,
        educationScore: dto.educationScore ?? null,
        classLeaderScore: dto.classLeaderScore ?? null,
        extracurricularScore: dto.extracurricularScore ?? null,
        organizationalScore: dto.organizationalScore ?? null,
        purpose: this.nullableText(dto.purpose),
        notes: this.nullableText(dto.notes),
        communicationDate: dto.communicationDate ? new Date(dto.communicationDate) : new Date(),
      }),
    );

    await this.recordAudit(actor?.userId, 'parent_comm.created', entity.id, {
      studentId: entity.studentId,
      sentiment: entity.sentiment,
    }, actor?.ipAddress);

    return this.findOne(entity.id);
  }

  async findAll(query: Partial<ParentCommQueryDto> = {}): Promise<ParentCommListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.nullableText(query.search);

    const qb = this.comms
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.student', 'student')
      .leftJoinAndSelect('pc.class', 'class')
      .leftJoinAndSelect('pc.parent', 'parent')
      .leftJoinAndSelect('pc.tutor', 'tutor')
      .leftJoinAndSelect('pc.createdBy', 'staff');

    this.applyFilters(qb, query, search);

    const [items, total] = await qb
      .orderBy('pc.communicationDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const pageCount = Math.ceil(total / limit) || 1;
    const stats = await this.computeStats(query);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      meta: { page, limit, total, pageCount },
      stats,
    };
  }

  /** Sentiment'dan tashqari barcha filterlar (stat va list uchun umumiy). */
  private applyFilters(
    qb: ReturnType<Repository<ParentCommunication>['createQueryBuilder']>,
    query: Partial<ParentCommQueryDto>,
    search: string | null,
  ): void {
    if (query.sentiment) {
      qb.andWhere('pc.sentiment = :sentiment', { sentiment: query.sentiment });
    }
    if (query.classId) {
      qb.andWhere('pc.class_id = :classId', { classId: query.classId });
    }
    if (query.year) {
      qb.andWhere('EXTRACT(YEAR FROM pc.communication_date) = :year', { year: query.year });
    }
    if (query.month) {
      qb.andWhere('EXTRACT(MONTH FROM pc.communication_date) = :month', { month: query.month });
    }
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('parent.first_name ILIKE :s', { s: `%${search}%` })
            .orWhere('parent.last_name ILIKE :s', { s: `%${search}%` })
            .orWhere('pc.purpose ILIKE :s', { s: `%${search}%` })
            .orWhere('pc.notes ILIKE :s', { s: `%${search}%` });
        }),
      );
    }
  }

  /** Stat kartalar joriy filterlar (sinf/yil/oy) bo'yicha, sentiment'siz. */
  private async computeStats(query: Partial<ParentCommQueryDto>) {
    const base = () => {
      const qb = this.comms.createQueryBuilder('pc');
      // sentiment filterini stat hisobiga qo'shmaymiz — har bir kartani alohida sanaymiz.
      this.applyFilters(qb, { ...query, sentiment: undefined }, null);
      return qb;
    };
    const [totalCount, positiveCount, neutralCount, negativeCount] = await Promise.all([
      base().getCount(),
      base().andWhere('pc.sentiment = :st', { st: CommunicationSentiment.POSITIVE }).getCount(),
      base().andWhere('pc.sentiment = :st', { st: CommunicationSentiment.NEUTRAL }).getCount(),
      base().andWhere('pc.sentiment = :st', { st: CommunicationSentiment.NEGATIVE }).getCount(),
    ]);
    return { totalCount, positiveCount, neutralCount, negativeCount };
  }

  async findOne(id: string): Promise<ParentCommResponseSchema> {
    return this.toResponseDto(await this.findEntity(id));
  }

  async update(id: string, dto: UpdateParentCommDto, actor?: ParentCommActor): Promise<ParentCommResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new NotFoundException('Kamida bitta maydon yuborilishi kerak');
    }
    const entity = await this.findEntity(id);

    if (dto.classId !== undefined) {
      if (dto.classId) {
        const cls = await this.classes.findOne({ where: { id: dto.classId } });
        if (!cls) throw new NotFoundException('Sinf topilmadi');
      }
      entity.classId = dto.classId ?? null;
    }
    if (dto.parentId !== undefined) entity.parentId = dto.parentId ?? null;
    if (dto.parentType !== undefined) entity.parentType = dto.parentType;
    if (dto.sentiment !== undefined) entity.sentiment = dto.sentiment;
    if (dto.tutorId !== undefined) entity.tutorId = dto.tutorId ?? null;
    if (dto.educationScore !== undefined) entity.educationScore = dto.educationScore ?? null;
    if (dto.classLeaderScore !== undefined) entity.classLeaderScore = dto.classLeaderScore ?? null;
    if (dto.extracurricularScore !== undefined) entity.extracurricularScore = dto.extracurricularScore ?? null;
    if (dto.organizationalScore !== undefined) entity.organizationalScore = dto.organizationalScore ?? null;
    if (dto.purpose !== undefined) entity.purpose = this.nullableText(dto.purpose);
    if (dto.notes !== undefined) entity.notes = this.nullableText(dto.notes);
    if (dto.communicationDate !== undefined && dto.communicationDate) {
      entity.communicationDate = new Date(dto.communicationDate);
    }

    await this.comms.save(entity);
    await this.recordAudit(actor?.userId, 'parent_comm.updated', entity.id, {
      changed: Object.keys(dto),
    }, actor?.ipAddress);
    return this.findOne(entity.id);
  }

  async remove(id: string, actor?: ParentCommActor): Promise<void> {
    const entity = await this.findEntity(id);
    await this.comms.softDelete(id);
    await this.recordAudit(actor?.userId, 'parent_comm.archived', entity.id, undefined, actor?.ipAddress);
  }

  private async findEntity(id: string): Promise<ParentCommunication> {
    const entity = await this.comms.findOne({
      where: { id },
      relations: { student: true, class: true, parent: true, tutor: true, createdBy: true },
    });
    if (!entity) {
      throw new NotFoundException('Muloqot topilmadi');
    }
    return entity;
  }

  private async recordAudit(
    userId: string | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.auditService.log({ userId, action, entity: 'parent_communication', entityId, ipAddress, details });
    } catch (error) {
      this.logger.warn(`Failed to write parent comm audit log: ${this.errorMessage(error)}`);
    }
  }

  private toResponseDto(e: ParentCommunication): ParentCommResponseSchema {
    return {
      id: e.id,
      studentId: e.studentId,
      studentName: e.student ? `${e.student.lastName} ${e.student.firstName}`.trim() : null,
      classId: e.classId ?? null,
      className: e.class ? this.classLabel(e.class) : null,
      parentId: e.parentId ?? null,
      parentName: e.parent ? `${e.parent.lastName} ${e.parent.firstName}`.trim() : null,
      parentType: e.parentType,
      sentiment: e.sentiment,
      tutorId: e.tutorId ?? null,
      tutorName: e.tutor ? `${e.tutor.lastName} ${e.tutor.firstName}`.trim() : null,
      createdById: e.createdById ?? null,
      staffName: e.createdBy ? `${e.createdBy.lastName} ${e.createdBy.firstName}`.trim() : null,
      educationScore: e.educationScore ?? null,
      classLeaderScore: e.classLeaderScore ?? null,
      extracurricularScore: e.extracurricularScore ?? null,
      organizationalScore: e.organizationalScore ?? null,
      purpose: e.purpose ?? null,
      notes: e.notes ?? null,
      communicationDate: e.communicationDate,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt ?? null,
      version: e.version,
    };
  }

  private classLabel(cls: SchoolClass): string {
    return `${cls.gradeLevel}-${cls.section}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
