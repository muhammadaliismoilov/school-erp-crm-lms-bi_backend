import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { Role } from '../identity/entities/role.entity';
import { User } from '../identity/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserGender } from '../users/enums/user.enums';
import { UsersService } from '../users/users.service';
import { CreateStaffMemberDto, StaffQueryDto, UpdateStaffMemberDto } from './dto/hr.dto';
import { StaffMember } from './entities/staff-member.entity';
import { StaffSalaryHistory } from './entities/staff-salary-history.entity';
import { Teacher } from './entities/teacher.entity';
import { EmploymentStatus, QualificationCategory } from './enums/hr.enums';

/** Login akkauntsiz xodim yaratish uchun kirish ma'lumoti (`createBareStaff`). */
export interface BareStaffInput {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  gender?: UserGender | null;
  birthDate?: string | null;
  passportSeries?: string | null;
  pinfl?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  qualificationCategory?: QualificationCategory | null;
  hireDate: string;
  employeeCode?: string | null;
}

/** Amalni bajargan aktor (audit/snapshot uchun). */
export interface StaffActor {
  userId?: string;
  username?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface StaffListResult {
  items: StaffMember[];
  meta: PageMeta;
}

/** Login user yaratilganda bir martalik ko'rsatiladigan ma'lumot. */
export interface CreatedStaffResult {
  staff: StaffMember;
  credentials: { username: string; password: string } | null;
}

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    @InjectRepository(StaffSalaryHistory) private readonly history: Repository<StaffSalaryHistory>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly usersService: UsersService,
    private readonly tenant: TenantContextService,
  ) {}

  async findStaff(query: StaffQueryDto): Promise<StaffListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.staff
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.department', 'department')
      .leftJoinAndSelect('s.position', 'position')
      .leftJoinAndSelect('s.user', 'user')
      // Ro'yxatda o'qituvchini belgilash (🎓) uchun bog'langan Teacher yozuvi.
      .leftJoinAndMapOne('s.teacher', Teacher, 't', 't.staff_member_id = s.id AND t.deleted_at IS NULL')
      .where('s.deleted_at IS NULL');
    applyTenantScope(qb, 's', this.tenant, { branch: true });

    // Ko'p-maktabli ajratish: aktiv maktab/filial bo'yicha avtomatik filtr.
    applyTenantScope(qb, 's', this.tenant, { branch: true });

    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.departmentId) qb.andWhere('s.department_id = :dep', { dep: query.departmentId });
    if (query.positionId) qb.andWhere('s.position_id = :pos', { pos: query.positionId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('s.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('s.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere("CONCAT(s.last_name, ' ', s.first_name) ILIKE :q", { q: `%${search}%` })
            .orWhere('s.email ILIKE :q', { q: `%${search}%` })
            .orWhere('s.phone ILIKE :q', { q: `%${search}%` })
            .orWhere('s.employee_code ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 } };
  }

  async getStaff(id: string): Promise<StaffMember> {
    // Boshqa maktab/filial xodimiga kirishni to'sish uchun scope shartlarini
    // where'ga qo'shamiz (kontekst yo'q — masalan worker — bo'lsa filtrsiz).
    const where: FindOptionsWhere<StaffMember> = { id };
    const schoolId = this.tenant.getSchoolId();
    if (schoolId) where.schoolId = schoolId;
    const branchId = this.tenant.getBranchId();
    if (branchId) where.filialId = branchId;

    const entity = await this.staff.findOne({
      where,
      relations: { department: true, position: true, user: true },
    });
    if (!entity) throw new NotFoundException('Xodim topilmadi');
    return entity;
  }

  async createStaff(dto: CreateStaffMemberDto, actor?: StaffActor): Promise<CreatedStaffResult> {
    // 1) Login user yaratamiz (parol avtomatik generatsiya qilinadi).
    const roleNames = dto.roleName ? [dto.roleName.trim()] : undefined;
    const userDto: CreateUserDto = {
      firstName: dto.firstName,
      firstNameCyrillic: dto.firstNameCyrillic?.trim() || dto.firstName,
      lastName: dto.lastName,
      lastNameCyrillic: dto.lastNameCyrillic?.trim() || dto.lastName,
      middleName: dto.middleName,
      middleNameCyrillic: dto.middleNameCyrillic,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender as UserGender,
      birthDate: dto.birthDate,
      documentNumber: dto.passportSeries,
      pinfl: dto.pinfl,
      roleNames,
    } as CreateUserDto;

    // Staff yozuvini quyida o'zimiz (bo'lim/lavozim/maosh bilan) yaratamiz, shu
    // sababli UsersService'ning avtomatik ko'zgu yozuvini o'chiramiz.
    const createdUser = await this.usersService.create(userDto, { skipStaffSync: true });

    // 2) Xodim yozuvini yaratamiz. Xatolik bo'lsa — userni qaytarib olamiz.
    try {
      const employeeCode = dto.employeeCode?.trim() || (await this.generateEmployeeCode());
      const salary = dto.salary ?? 0;
      const staff = await this.staff.save(
        this.staff.create({
          employeeCode,
          userId: createdUser.id,
          schoolId: this.tenant.getSchoolId(),
          filialId: this.tenant.getBranchId(),
          firstName: dto.firstName,
          firstNameCyrillic: dto.firstNameCyrillic ?? null,
          lastName: dto.lastName,
          lastNameCyrillic: dto.lastNameCyrillic ?? null,
          middleName: dto.middleName ?? null,
          middleNameCyrillic: dto.middleNameCyrillic ?? null,
          gender: (dto.gender as UserGender) ?? null,
          birthDate: dto.birthDate ?? null,
          passportSeries: dto.passportSeries ?? null,
          pinfl: dto.pinfl ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          photoUrl: dto.photoUrl ?? null,
          departmentId: dto.departmentId ?? null,
          positionId: dto.positionId ?? null,
          hireDate: dto.hireDate,
          status: dto.status,
          salary,
          qualificationCategory: dto.qualificationCategory ?? null,
          qualificationDate: dto.qualificationDate ?? null,
        }),
      );

      // 3) Boshlang'ich maoshni tarixga yozamiz.
      if (salary > 0) {
        await this.history.save(
          this.history.create({
            staffMemberId: staff.id,
            oldSalary: null,
            newSalary: salary,
            reason: dto.salaryChangeReason?.trim() || 'Boshlang‘ich maosh',
            changedById: actor?.userId ?? null,
            changedByName: actor?.username ?? null,
          }),
        );
      }

      return {
        staff: await this.getStaff(staff.id),
        credentials: { username: createdUser.login, password: createdUser.generatedPassword },
      };
    } catch (error) {
      // Orphan user qolmasligi uchun — yaratilgan userni o'chiramiz.
      await this.users.softDelete(createdUser.id).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Login akkauntsiz ("bare") xodim yozuvi yaratadi. `createStaff`dan farqi —
   * `User` (login) yaratmaydi. Boshqa modullar (masalan o'qituvchi qo'shish)
   * shaxsiy ma'lumotni yagona manba — `StaffMember` da saqlash uchun ishlatadi.
   * Kerak bo'lsa login keyinroq xodim modulidan biriktiriladi.
   */
  async createBareStaff(input: BareStaffInput): Promise<StaffMember> {
    const employeeCode = input.employeeCode?.trim() || (await this.generateEmployeeCode());
    return this.staff.save(
      this.staff.create({
        employeeCode,
        schoolId: this.tenant.getSchoolId(),
        filialId: this.tenant.getBranchId(),
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName ?? null,
        gender: input.gender ?? null,
        birthDate: input.birthDate ?? null,
        passportSeries: input.passportSeries ?? null,
        pinfl: input.pinfl ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        photoUrl: input.photoUrl ?? null,
        qualificationCategory: input.qualificationCategory ?? null,
        hireDate: input.hireDate,
        status: EmploymentStatus.ACTIVE,
        salary: 0,
      }),
    );
  }

  async updateStaff(id: string, dto: UpdateStaffMemberDto, actor?: StaffActor): Promise<StaffMember> {
    const staff = await this.getStaff(id);

    // Maosh o'zgarsa — tarixga yozamiz.
    if (dto.salary !== undefined && Number(dto.salary) !== Number(staff.salary)) {
      await this.history.save(
        this.history.create({
          staffMemberId: staff.id,
          oldSalary: Number(staff.salary),
          newSalary: Number(dto.salary),
          reason: dto.salaryChangeReason?.trim() || 'Maosh o‘zgartirildi',
          changedById: actor?.userId ?? null,
          changedByName: actor?.username ?? null,
        }),
      );
    }

    this.assignStaffFields(staff, dto);
    const saved = await this.staff.save(staff);

    // Bog'langan login userni sinxronlaymiz (ism, aloqa, rol).
    if (staff.userId) {
      await this.syncUser(staff.userId, dto).catch((e) =>
        this.logger.warn(`Staff user sync failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }

    return this.getStaff(saved.id);
  }

  async removeStaff(id: string): Promise<void> {
    const staff = await this.getStaff(id);
    await this.staff.softDelete(staff.id);
    // Bog'langan o'qituvchilik yozuvi yetim qolmasligi uchun birga o'chiriladi.
    await this.teachers.softDelete({ staffMemberId: staff.id });
  }

  async getSalaryHistory(id: string): Promise<StaffSalaryHistory[]> {
    await this.getStaff(id); // mavjudligini tekshirish
    return this.history.find({ where: { staffMemberId: id }, order: { createdAt: 'DESC' } });
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private assignStaffFields(staff: StaffMember, dto: UpdateStaffMemberDto): void {
    const fields: (keyof UpdateStaffMemberDto & keyof StaffMember)[] = [
      'firstName', 'firstNameCyrillic', 'lastName', 'lastNameCyrillic',
      'middleName', 'middleNameCyrillic', 'gender', 'birthDate', 'passportSeries',
      'pinfl', 'phone', 'email', 'photoUrl', 'departmentId', 'positionId', 'hireDate', 'status', 'salary',
      'qualificationCategory', 'qualificationDate',
    ];
    for (const f of fields) {
      const value = dto[f];
      if (value !== undefined) {
        (staff as unknown as Record<string, unknown>)[f] = value;
      }
    }
  }

  private async syncUser(userId: string, dto: UpdateStaffMemberDto): Promise<void> {
    const user = await this.users.findOne({ where: tenantWhere<User>(this.tenant, { id: userId }, { branch: true }), relations: { roles: true } });
    if (!user) return;

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.firstNameCyrillic !== undefined) user.firstNameCyrillic = dto.firstNameCyrillic ?? null;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.lastNameCyrillic !== undefined) user.lastNameCyrillic = dto.lastNameCyrillic ?? null;
    if (dto.middleName !== undefined) user.middleName = dto.middleName ?? null;
    if (dto.email !== undefined) user.email = dto.email ?? null;
    if (dto.phone !== undefined) user.phone = dto.phone ?? null;
    if (dto.gender !== undefined) user.gender = (dto.gender as UserGender) ?? null;
    if (dto.birthDate !== undefined) user.birthDate = dto.birthDate ?? null;

    if (dto.roleName) {
      const role = await this.roles.findOne({ where: tenantWhere<Role>(this.tenant, { name: dto.roleName.trim() }, { branch: true }) });
      if (role) user.roles = [role];
    }

    await this.users.save(user);
  }

  private async generateEmployeeCode(): Promise<string> {
    // Eng katta mavjud raqamdan keyingisini olamiz (soft-deleted'larni ham hisobga olib).
    const count = await this.staff.count({ withDeleted: true });
    let n = count + 1;
    // Noyoblikni kafolatlaymiz.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const code = `EMP-${String(n).padStart(4, '0')}`;
      const exists = await this.staff.findOne({ where: tenantWhere<StaffMember>(this.tenant, { employeeCode: code }, { branch: true }), withDeleted: true });
      if (!exists) return code;
      n += 1;
    }
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
