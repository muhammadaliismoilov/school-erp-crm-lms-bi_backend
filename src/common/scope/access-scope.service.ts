import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassLeaderAssignment } from '../../modules/hr/entities/class-leader-assignment.entity';
import { StaffMember } from '../../modules/hr/entities/staff-member.entity';
import { Teacher } from '../../modules/hr/entities/teacher.entity';
import { StudentParent } from '../../modules/students/entities/student-parent.entity';
import { TimetableSlot } from '../../modules/timetable/entities/timetable-slot.entity';
import { TenantContextService } from '../tenant/tenant-context.service';
import { applyTenantScope } from '../tenant/tenant-scope.util';
import { DataScope, EMPTY_OWN_SCOPE, type OwnScope } from './data-scope.enum';

/**
 * "O'ziniki" tushunchasining YAGONA manbasi.
 *
 * Foydalanuvchining doirasi `OWN` bo'lsa, u ko'radigan qatorlar shu yerda
 * hisoblangan identifikatorlar bilan chegaralanadi. Ta'rif ataylab bitta
 * joyda: aks holda har modul o'zicha "mening sinfim" ni turlicha talqin
 * qilib, teshiklar paydo bo'lardi.
 *
 * O'z sinflari (o'qituvchi uchun) = sinf rahbarligi ∪ dars jadvalidagi sinflar.
 *  - sinf rahbarligi bugungi kunga AKTIV bo'lgan biriktiruvlardan olinadi
 *    (o'tgan yil rahbarlik qilgan sinf endi "meniki" emas);
 *  - dars jadvali — o'qituvchi dars beradigan barcha sinflar.
 * O'z farzandlari (ota-ona uchun) = `student_parents` bog'lanishi.
 *
 * Natija so'rov davomida bir marta hisoblanadi va tenant kontekstida
 * keshlanadi — bitta handler bir necha marta so'rasa, DB'ga qayta bormaydi.
 */
@Injectable()
export class AccessScopeService {
  constructor(
    @InjectRepository(StaffMember)
    private readonly staff: Repository<StaffMember>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(ClassLeaderAssignment)
    private readonly leaderships: Repository<ClassLeaderAssignment>,
    @InjectRepository(TimetableSlot)
    private readonly slots: Repository<TimetableSlot>,
    @InjectRepository(StudentParent)
    private readonly studentParents: Repository<StudentParent>,
    private readonly tenant: TenantContextService,
  ) {}

  /** Joriy so'rov egalik filtriga tushadimi. */
  isRestricted(): boolean {
    return this.tenant.getDataScope() === DataScope.OWN;
  }

  /**
   * Joriy foydalanuvchining "o'ziniki" identifikatorlari. Doira `ALL` bo'lsa
   * chaqirilmasligi kerak — chaqirilsa ham bo'sh natija qaytadi, chunki
   * chegaralanmagan so'rovda bu ro'yxatning ma'nosi yo'q.
   */
  async resolveOwnScope(): Promise<OwnScope> {
    const cached = this.tenant.getOwnScope();
    if (cached) return cached;

    const userId = this.tenant.getUserId();
    if (!userId) return EMPTY_OWN_SCOPE;

    const [classIds, studentIds] = await Promise.all([
      this.resolveOwnClassIds(userId),
      this.resolveOwnStudentIds(userId),
    ]);

    const scope: OwnScope = { classIds, studentIds };
    this.tenant.set({ ownScope: scope });
    return scope;
  }

  /** Sinf rahbarligi ∪ dars jadvali. Xodim/o'qituvchi bo'lmasa — bo'sh. */
  private async resolveOwnClassIds(userId: string): Promise<string[]> {
    const teacherId = await this.resolveTeacherId(userId);
    if (!teacherId) return [];

    const today = new Date().toISOString().slice(0, 10);

    const leadershipQb = this.leaderships
      .createQueryBuilder('a')
      .select('DISTINCT a.class_id', 'classId')
      .where('a.deleted_at IS NULL')
      .andWhere('a.teacher_id = :teacherId', { teacherId })
      .andWhere('a.start_date <= :today AND (a.end_date IS NULL OR a.end_date >= :today)', { today });
    applyTenantScope(leadershipQb, 'a', this.tenant, { branch: true });

    const slotQb = this.slots
      .createQueryBuilder('s')
      .select('DISTINCT s.class_id', 'classId')
      .where('s.deleted_at IS NULL')
      .andWhere('s.teacher_id = :teacherId', { teacherId });
    applyTenantScope(slotQb, 's', this.tenant, { branch: true });

    const [leadershipRows, slotRows] = await Promise.all([
      leadershipQb.getRawMany<{ classId: string }>(),
      slotQb.getRawMany<{ classId: string }>(),
    ]);

    return Array.from(
      new Set([...leadershipRows, ...slotRows].map((row) => row.classId).filter(Boolean)),
    );
  }

  /** Ota-ona sifatida bog'langan o'quvchilar. */
  private async resolveOwnStudentIds(userId: string): Promise<string[]> {
    const qb = this.studentParents
      .createQueryBuilder('sp')
      .select('DISTINCT sp.student_id', 'studentId')
      .where('sp.deleted_at IS NULL')
      .andWhere('sp.parent_id = :userId', { userId });
    applyTenantScope(qb, 'sp', this.tenant, { branch: true });

    const rows = await qb.getRawMany<{ studentId: string }>();
    return rows.map((row) => row.studentId).filter(Boolean);
  }

  /** `users.id` → `hr_teachers.id` (xodim yozuvi orqali). */
  private async resolveTeacherId(userId: string): Promise<string | null> {
    const member = await this.staff.findOne({
      where: { userId },
      select: { id: true },
    });
    if (!member) return null;

    const teacher = await this.teachers.findOne({
      where: { staffMemberId: member.id },
      select: { id: true },
    });
    return teacher?.id ?? null;
  }
}
