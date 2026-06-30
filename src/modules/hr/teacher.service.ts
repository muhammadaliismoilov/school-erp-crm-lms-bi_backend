import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateTeacherDto, TeacherQueryDto, UpdateTeacherDto } from './dto/teacher.dto';
import { Teacher } from './entities/teacher.entity';
import { StaffMember } from './entities/staff-member.entity';
import { TeacherStatus, TeacherWorkType } from './enums/hr.enums';
import { UserGender } from '../users/enums/user.enums';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface TeacherResponse {
  id: string;
  staffMemberId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  gender: UserGender | null;
  birthDate: string | null;
  documentNumber: string | null;
  pinfl: string | null;
  phone: string | null;
  email: string | null;
  workType: TeacherWorkType;
  degree: Teacher['degree'];
  employmentType: Teacher['employmentType'];
  status: TeacherStatus;
  category: Teacher['category'];
  experienceYears: number;
  ratePerLesson: number;
  startDate: string | null;
  endDate: string | null;
  isSubjectTeacher: boolean;
  isAssistantTeacher: boolean;
  isMbr: boolean;
  isExtraLesson: boolean;
  isClassLeader: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherListResult {
  items: TeacherResponse[];
  meta: PageMeta;
}

export interface TeacherStats {
  total: number;
  active: number;
  fullTime: number;
  hourly: number;
  subjectTeachers: number;
}

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
  ) {}

  async findTeachers(query: TeacherQueryDto): Promise<TeacherListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.teachers.createQueryBuilder('t').where('t.deleted_at IS NULL');

    if (query.category) qb.andWhere('t.category = :category', { category: query.category });
    if (query.workType) qb.andWhere('t.work_type = :workType', { workType: query.workType });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('t.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('t.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere("CONCAT(t.last_name, ' ', t.first_name) ILIKE :q", { q: `%${search}%` })
            .orWhere('t.phone ILIKE :q', { q: `%${search}%` })
            .orWhere('t.pinfl ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('t.lastName', 'ASC')
      .addOrderBy('t.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((t) => this.toResponse(t)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async stats(): Promise<TeacherStats> {
    const base = () => this.teachers.createQueryBuilder('t').where('t.deleted_at IS NULL');
    const [total, active, fullTime, hourly, subjectTeachers] = await Promise.all([
      base().getCount(),
      base().andWhere('t.status = :s', { s: TeacherStatus.ACTIVE }).getCount(),
      base().andWhere('t.work_type = :w', { w: TeacherWorkType.FULL }).getCount(),
      base().andWhere('t.work_type = :w', { w: TeacherWorkType.HOURLY }).getCount(),
      base().andWhere('t.is_subject_teacher = true').getCount(),
    ]);
    return { total, active, fullTime, hourly, subjectTeachers };
  }

  async getTeacher(id: string): Promise<TeacherResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createTeacher(dto: CreateTeacherDto): Promise<TeacherResponse> {
    if (dto.staffMemberId) await this.assertStaff(dto.staffMemberId);
    this.assertDateRange(dto.startDate, dto.endDate);

    const entity = await this.teachers.save(
      this.teachers.create({
        staffMemberId: dto.staffMemberId ?? null,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        middleName: this.nullableText(dto.middleName),
        gender: dto.gender ?? null,
        birthDate: dto.birthDate ?? null,
        documentNumber: this.nullableText(dto.documentNumber),
        pinfl: this.nullableText(dto.pinfl),
        phone: this.nullableText(dto.phone),
        email: this.nullableText(dto.email),
        workType: dto.workType ?? TeacherWorkType.FULL,
        degree: dto.degree ?? null,
        employmentType: dto.employmentType ?? undefined,
        status: dto.status ?? TeacherStatus.ACTIVE,
        category: dto.category ?? null,
        experienceYears: dto.experienceYears ?? 0,
        ratePerLesson: dto.ratePerLesson ?? 0,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        isSubjectTeacher: dto.isSubjectTeacher ?? true,
        isAssistantTeacher: dto.isAssistantTeacher ?? false,
        isMbr: dto.isMbr ?? false,
        isExtraLesson: dto.isExtraLesson ?? false,
        isClassLeader: dto.isClassLeader ?? false,
        note: this.nullableText(dto.note),
      }),
    );
    return this.getTeacher(entity.id);
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto): Promise<TeacherResponse> {
    const entity = await this.findEntity(id);
    if (dto.staffMemberId !== undefined) {
      if (dto.staffMemberId) await this.assertStaff(dto.staffMemberId);
      entity.staffMemberId = dto.staffMemberId || null;
    }
    if (dto.firstName !== undefined) entity.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) entity.lastName = dto.lastName.trim();
    if (dto.middleName !== undefined) entity.middleName = this.nullableText(dto.middleName);
    if (dto.gender !== undefined) entity.gender = dto.gender ?? null;
    if (dto.birthDate !== undefined) entity.birthDate = dto.birthDate ?? null;
    if (dto.documentNumber !== undefined) entity.documentNumber = this.nullableText(dto.documentNumber);
    if (dto.pinfl !== undefined) entity.pinfl = this.nullableText(dto.pinfl);
    if (dto.phone !== undefined) entity.phone = this.nullableText(dto.phone);
    if (dto.email !== undefined) entity.email = this.nullableText(dto.email);
    if (dto.workType !== undefined) entity.workType = dto.workType;
    if (dto.degree !== undefined) entity.degree = dto.degree ?? null;
    if (dto.employmentType !== undefined) entity.employmentType = dto.employmentType;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.category !== undefined) entity.category = dto.category ?? null;
    if (dto.experienceYears !== undefined) entity.experienceYears = dto.experienceYears;
    if (dto.ratePerLesson !== undefined) entity.ratePerLesson = dto.ratePerLesson;
    if (dto.startDate !== undefined) entity.startDate = dto.startDate ?? null;
    if (dto.endDate !== undefined) entity.endDate = dto.endDate ?? null;
    this.assertDateRange(entity.startDate, entity.endDate);
    if (dto.isSubjectTeacher !== undefined) entity.isSubjectTeacher = dto.isSubjectTeacher;
    if (dto.isAssistantTeacher !== undefined) entity.isAssistantTeacher = dto.isAssistantTeacher;
    if (dto.isMbr !== undefined) entity.isMbr = dto.isMbr;
    if (dto.isExtraLesson !== undefined) entity.isExtraLesson = dto.isExtraLesson;
    if (dto.isClassLeader !== undefined) entity.isClassLeader = dto.isClassLeader;
    if (dto.note !== undefined) entity.note = this.nullableText(dto.note);

    await this.teachers.save(entity);
    return this.getTeacher(entity.id);
  }

  async removeTeacher(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.teachers.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Teacher> {
    const entity = await this.teachers.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('O‘qituvchi topilmadi');
    return entity;
  }

  private async assertStaff(staffMemberId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: { id: staffMemberId } });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  private assertDateRange(start?: string | null, end?: string | null): void {
    if (start && end && end < start) {
      throw new BadRequestException('Ish tugagan sana boshlangan sanadan oldin bo‘lishi mumkin emas');
    }
  }

  private toResponse(t: Teacher): TeacherResponse {
    const fullName = `${t.lastName ?? ''} ${t.firstName ?? ''} ${t.middleName ?? ''}`.trim().replace(/\s+/g, ' ');
    return {
      id: t.id,
      staffMemberId: t.staffMemberId ?? null,
      firstName: t.firstName,
      lastName: t.lastName,
      middleName: t.middleName ?? null,
      fullName,
      gender: t.gender ?? null,
      birthDate: t.birthDate ?? null,
      documentNumber: t.documentNumber ?? null,
      pinfl: t.pinfl ?? null,
      phone: t.phone ?? null,
      email: t.email ?? null,
      workType: t.workType,
      degree: t.degree ?? null,
      employmentType: t.employmentType,
      status: t.status,
      category: t.category ?? null,
      experienceYears: t.experienceYears,
      ratePerLesson: Number(t.ratePerLesson) || 0,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null,
      isSubjectTeacher: t.isSubjectTeacher,
      isAssistantTeacher: t.isAssistantTeacher,
      isMbr: t.isMbr,
      isExtraLesson: t.isExtraLesson,
      isClassLeader: t.isClassLeader,
      note: t.note ?? null,
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
