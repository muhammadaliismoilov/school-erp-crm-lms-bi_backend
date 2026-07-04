import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { SchoolClass } from '../academic/entities/school-class.entity';
import {
  ClassLeaderQueryDto,
  CreateClassLeaderAssignmentDto,
  UpdateClassLeaderAssignmentDto,
} from './dto/class-leader.dto';
import { ClassLeaderAssignment } from './entities/class-leader-assignment.entity';
import { Teacher } from './entities/teacher.entity';
import { PayrollConfigService } from './payroll-config.service';

export interface ClassLeaderAssignmentResponse {
  id: string;
  teacherId: string;
  teacherName: string | null;
  classId: string;
  className: string | null;
  startDate: string;
  endDate: string | null;
  note: string | null;
  createdAt: Date;
}

/**
 * Sinf rahbarligi biriktiruvlari. Qoidalar:
 *  - bitta sinfda bir davrda faqat bitta rahbar (kesishish taqiqlanadi);
 *  - bitta o'qituvchida bir vaqtda ko'pi bilan `maxClassLeaderships` ta sinf
 *    (PayrollSettings'dan, default 3);
 *  - oy o'rtasida almashtirish: eskisiga endDate qo'yiladi, yangisi ochiladi —
 *    dvigatel kunlar bo'yicha proporsional hisoblaydi.
 */
@Injectable()
export class ClassLeaderService {
  constructor(
    @InjectRepository(ClassLeaderAssignment)
    private readonly assignments: Repository<ClassLeaderAssignment>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(SchoolClass) private readonly classes: Repository<SchoolClass>,
    private readonly config: PayrollConfigService,
    private readonly tenant: TenantContextService,
  ) {}

  async find(query: ClassLeaderQueryDto): Promise<ClassLeaderAssignmentResponse[]> {
    const qb = this.assignments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.teacher', 't')
      .leftJoinAndSelect('t.staffMember', 'sm')
      .leftJoinAndSelect('a.schoolClass', 'c')
      .where('a.deleted_at IS NULL')
      .orderBy('a.start_date', 'DESC');
    applyTenantScope(qb, 'a', this.tenant, { branch: true });
    if (query.teacherId) qb.andWhere('a.teacher_id = :tid', { tid: query.teacherId });
    if (query.classId) qb.andWhere('a.class_id = :cid', { cid: query.classId });
    if (query.activeOn) {
      qb.andWhere('a.start_date <= :d AND (a.end_date IS NULL OR a.end_date >= :d)', { d: query.activeOn });
    }
    const items = await qb.getMany();
    return items.map((a) => this.toResponse(a));
  }

  async assign(dto: CreateClassLeaderAssignmentDto): Promise<ClassLeaderAssignmentResponse> {
    this.assertRange(dto.startDate, dto.endDate ?? null);

    const teacher = await this.teachers.findOne({
      where: tenantWhere<Teacher>(this.tenant, { id: dto.teacherId }, { branch: true }),
    });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const schoolClass = await this.classes.findOne({
      where: tenantWhere<SchoolClass>(this.tenant, { id: dto.classId }, { branch: true }),
    });
    if (!schoolClass) throw new NotFoundException('Sinf topilmadi');

    // 1) Sinfda shu davrda boshqa rahbar bo'lmasin.
    const classClash = await this.overlapQb(dto.startDate, dto.endDate ?? null)
      .andWhere('a.class_id = :cid', { cid: dto.classId })
      .getCount();
    if (classClash > 0) {
      throw new BadRequestException("Bu sinfda tanlangan davrda rahbar allaqachon biriktirilgan");
    }

    // 2) O'qituvchining bir vaqtdagi rahbarliklari chegaradan oshmasin.
    const settings = await this.config.currentSettings();
    const teacherActive = await this.overlapQb(dto.startDate, dto.endDate ?? null)
      .andWhere('a.teacher_id = :tid', { tid: dto.teacherId })
      .getCount();
    if (teacherActive >= settings.maxClassLeaderships) {
      throw new BadRequestException(
        `O'qituvchi bir vaqtda ko'pi bilan ${settings.maxClassLeaderships} ta sinfga rahbar bo'la oladi`,
      );
    }

    const entity = await this.assignments.save(
      this.assignments.create({
        teacherId: dto.teacherId,
        classId: dto.classId,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        note: dto.note ?? null,
      }),
    );
    return this.toResponse(await this.getOne(entity.id));
  }

  /** Odatda rahbarlikni yopish (endDate) — almashtirishda eski yozuv shu orqali yakunlanadi. */
  async update(id: string, dto: UpdateClassLeaderAssignmentDto): Promise<ClassLeaderAssignmentResponse> {
    const entity = await this.getOne(id);
    if (dto.endDate !== undefined) {
      this.assertRange(entity.startDate, dto.endDate);
      entity.endDate = dto.endDate;
    }
    if (dto.note !== undefined) entity.note = dto.note ?? null;
    await this.assignments.save(entity);
    return this.toResponse(await this.getOne(id));
  }

  /** Xato kiritilgan yozuvni olib tashlash (soft). Tarixiy yozuvlar odatda endDate bilan yopiladi. */
  async remove(id: string): Promise<void> {
    const entity = await this.getOne(id);
    await this.assignments.softDelete(entity.id);
  }

  // ─── Helperlar ────────────────────────────────────────────────────────────

  /** [start, end] oralig'i bilan kesishuvchi faol yozuvlar QB'si (tenant-scoped). */
  private overlapQb(startDate: string, endDate: string | null) {
    const qb = this.assignments
      .createQueryBuilder('a')
      .where('a.deleted_at IS NULL')
      .andWhere('(a.end_date IS NULL OR a.end_date >= :s)', { s: startDate });
    if (endDate) qb.andWhere('a.start_date <= :e', { e: endDate });
    applyTenantScope(qb, 'a', this.tenant, { branch: true });
    return qb;
  }

  private assertRange(startDate: string, endDate: string | null): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas');
    }
  }

  private async getOne(id: string): Promise<ClassLeaderAssignment> {
    const entity = await this.assignments.findOne({
      where: tenantWhere<ClassLeaderAssignment>(this.tenant, { id }, { branch: true }),
      relations: { teacher: { staffMember: true }, schoolClass: true },
    });
    if (!entity) throw new NotFoundException('Biriktiruv topilmadi');
    return entity;
  }

  private toResponse(a: ClassLeaderAssignment): ClassLeaderAssignmentResponse {
    const sm = a.teacher?.staffMember;
    return {
      id: a.id,
      teacherId: a.teacherId,
      teacherName: sm ? `${sm.lastName} ${sm.firstName}`.trim() : null,
      classId: a.classId,
      className: a.schoolClass?.name ?? null,
      startDate: a.startDate,
      endDate: a.endDate ?? null,
      note: a.note ?? null,
      createdAt: a.createdAt,
    };
  }
}
