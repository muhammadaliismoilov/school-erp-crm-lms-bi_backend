import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateTeacherDto, TeacherQueryDto, UpdateTeacherDto } from './dto/teacher.dto';
import { UpdateStaffMemberDto } from './dto/hr.dto';
import { Teacher } from './entities/teacher.entity';
import { StaffMember } from './entities/staff-member.entity';
import { StaffService } from './staff.service';
import { QualificationCategory, TeacherStatus, TeacherWorkType } from './enums/hr.enums';
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
  photoUrl: string | null;
  workType: TeacherWorkType;
  degree: Teacher['degree'];
  employmentType: Teacher['employmentType'];
  status: TeacherStatus;
  // Malaka toifasi — bog'langan xodim (StaffMember)dan o'qiladi/yoziladi.
  category: QualificationCategory | null;
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
    private readonly staffService: StaffService,
  ) {}

  async findTeachers(query: TeacherQueryDto): Promise<TeacherListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.teachers
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.staffMember', 'sm')
      .where('t.deleted_at IS NULL');

    if (query.category) qb.andWhere('sm.qualification_category = :category', { category: query.category });
    if (query.workType) qb.andWhere('t.work_type = :workType', { workType: query.workType });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          // Shaxsiy ma'lumot manbasi — bog'langan xodim (sm).
          w.where('sm.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('sm.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere("CONCAT(sm.last_name, ' ', sm.first_name) ILIKE :q", { q: `%${search}%` })
            .orWhere('sm.phone ILIKE :q', { q: `%${search}%` })
            .orWhere('sm.pinfl ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('sm.lastName', 'ASC')
      .addOrderBy('sm.firstName', 'ASC')
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

  /**
   * Xodim (StaffMember) IDsi bo'yicha bog'langan o'qituvchini qaytaradi.
   * Xodim o'qituvchi bo'lmasa `null` (xatolik emas) — xodim kartochkasida
   * o'qituvchi ma'lumotini shartli ko'rsatish uchun.
   */
  async getTeacherByStaff(staffMemberId: string): Promise<TeacherResponse | null> {
    const entity = await this.teachers.findOne({
      where: { staffMemberId },
      relations: { staffMember: true },
    });
    return entity ? this.toResponse(entity) : null;
  }

  async createTeacher(dto: CreateTeacherDto): Promise<TeacherResponse> {
    this.assertDateRange(dto.startDate, dto.endDate);

    // "O'qituvchi har doim xodim" — staffMemberId berilmasa, shaxsiy ma'lumotdan
    // yangi (login-siz) xodim yaratib bog'laymiz. Shunda shaxsiy ma'lumotning
    // yagona manbasi — StaffMember bo'ladi va yetim o'qituvchi paydo bo'lmaydi.
    let staffMemberId: string;
    let createdStaffId: string | null = null;
    if (dto.staffMemberId) {
      await this.assertStaff(dto.staffMemberId);
      staffMemberId = dto.staffMemberId;
      // Malaka toifasi va fotosurat ham xodimda (yagona manba) saqlanadi — berilsa yozamiz.
      if (dto.category !== undefined || dto.photoUrl !== undefined) {
        await this.staffService.updateStaff(staffMemberId, {
          ...(dto.category !== undefined ? { qualificationCategory: dto.category ?? null } : {}),
          ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl ?? null } : {}),
        } as unknown as UpdateStaffMemberDto);
      }
    } else {
      const staff = await this.staffService.createBareStaff({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        middleName: this.nullableText(dto.middleName),
        gender: dto.gender ?? null,
        birthDate: dto.birthDate ?? null,
        passportSeries: this.nullableText(dto.documentNumber),
        pinfl: this.nullableText(dto.pinfl),
        phone: this.nullableText(dto.phone),
        email: this.nullableText(dto.email),
        photoUrl: this.nullableText(dto.photoUrl),
        qualificationCategory: dto.category ?? null,
        hireDate: dto.startDate ?? new Date().toISOString().slice(0, 10),
      });
      staffMemberId = staff.id;
      createdStaffId = staff.id;
    }

    try {
      // Shaxsiy ma'lumot StaffMember'da — bu yerda faqat o'qituvchiga xos maydonlar.
      const entity = await this.teachers.save(
        this.teachers.create({
          staffMemberId,
          workType: dto.workType ?? TeacherWorkType.FULL,
          degree: dto.degree ?? null,
          employmentType: dto.employmentType ?? undefined,
          status: dto.status ?? TeacherStatus.ACTIVE,
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
    } catch (error) {
      // Xato bo'lsa — biz shu amalda yaratgan xodim orphan qolmasligi uchun
      // uni qaytarib olamiz (mavjud xodimga bog'langan bo'lsa tegmaymiz).
      if (createdStaffId) await this.staff.softDelete(createdStaffId).catch(() => undefined);
      throw error;
    }
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto): Promise<TeacherResponse> {
    const entity = await this.findEntity(id);
    // Xodim bog'lanishi majburiy — uni faqat boshqa mavjud xodimga o'tkazish
    // mumkin, bo'sh qilib qo'yib bo'lmaydi.
    if (dto.staffMemberId) {
      await this.assertStaff(dto.staffMemberId);
      entity.staffMemberId = dto.staffMemberId;
    }
    // Shaxsiy ma'lumot yagona manba — bog'langan xodimga (StaffMember) yoziladi.
    // StaffService orqali — shunda login user (agar bor bo'lsa) ham sinxronlanadi.
    await this.syncStaffPersonalFields(entity.staffMemberId, dto);

    if (dto.workType !== undefined) entity.workType = dto.workType;
    if (dto.degree !== undefined) entity.degree = dto.degree ?? null;
    if (dto.employmentType !== undefined) entity.employmentType = dto.employmentType;
    if (dto.status !== undefined) entity.status = dto.status;
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
    const entity = await this.teachers.findOne({ where: { id }, relations: { staffMember: true } });
    if (!entity) throw new NotFoundException('O‘qituvchi topilmadi');
    return entity;
  }

  private async assertStaff(staffMemberId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: { id: staffMemberId } });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  /**
   * O'qituvchi formasidagi shaxsiy maydonlarni bog'langan xodimga (yagona
   * manba) yozadi. StaffService orqali — login user ham sinxronlanadi.
   * documentNumber → passportSeries maydoniga map qilinadi.
   */
  private async syncStaffPersonalFields(staffMemberId: string, dto: UpdateTeacherDto): Promise<void> {
    const patch: Record<string, string | null> = {};
    if (dto.firstName !== undefined) patch.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) patch.lastName = dto.lastName.trim();
    if (dto.middleName !== undefined) patch.middleName = this.nullableText(dto.middleName);
    if (dto.gender !== undefined) patch.gender = dto.gender ?? null;
    if (dto.birthDate !== undefined) patch.birthDate = dto.birthDate ?? null;
    if (dto.documentNumber !== undefined) patch.passportSeries = this.nullableText(dto.documentNumber);
    if (dto.pinfl !== undefined) patch.pinfl = this.nullableText(dto.pinfl);
    if (dto.phone !== undefined) patch.phone = this.nullableText(dto.phone);
    if (dto.email !== undefined) patch.email = this.nullableText(dto.email);
    if (dto.photoUrl !== undefined) patch.photoUrl = this.nullableText(dto.photoUrl);
    // Malaka toifasi ham xodimda saqlanadi (o'qituvchidan olib tashlandi).
    if (dto.category !== undefined) patch.qualificationCategory = dto.category ?? null;

    if (Object.keys(patch).length === 0) return;
    await this.staffService.updateStaff(staffMemberId, patch as unknown as UpdateStaffMemberDto);
  }

  private assertDateRange(start?: string | null, end?: string | null): void {
    if (start && end && end < start) {
      throw new BadRequestException('Ish tugagan sana boshlangan sanadan oldin bo‘lishi mumkin emas');
    }
  }

  private toResponse(t: Teacher): TeacherResponse {
    // Shaxsiy ma'lumotning yagona manbasi — bog'langan xodim (StaffMember).
    // Bog'lanish majburiy, lekin relation yuklanmagan holatga qarshi himoya.
    const sm = t.staffMember ?? null;
    const firstName = sm?.firstName ?? '';
    const lastName = sm?.lastName ?? '';
    const middleName = sm?.middleName ?? null;
    const fullName = `${lastName} ${firstName} ${middleName ?? ''}`.trim().replace(/\s+/g, ' ');
    return {
      id: t.id,
      staffMemberId: t.staffMemberId,
      firstName,
      lastName,
      middleName,
      fullName,
      gender: sm?.gender ?? null,
      birthDate: sm?.birthDate ?? null,
      documentNumber: sm?.passportSeries ?? null,
      pinfl: sm?.pinfl ?? null,
      phone: sm?.phone ?? null,
      email: sm?.email ?? null,
      photoUrl: sm?.photoUrl ?? null,
      workType: t.workType,
      degree: t.degree ?? null,
      employmentType: t.employmentType,
      status: t.status,
      category: sm?.qualificationCategory ?? null,
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
