import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Brackets, In, IsNull, Not, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { CommonStatus } from '../../common/enums/common-status.enum';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import {
  assertNotSelf,
  assertPasswordResettable,
  assertPrivilegedRolesManageable,
  assertRolesGrantable,
  isSuperAdmin,
} from '../../common/security/privilege.policy';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { Student } from '../students/entities/student.entity';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { Role } from '../identity/entities/role.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { EmploymentStatus } from '../hr/enums/hr.enums';
import { User } from './entities/user.entity';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ReassignSchoolDto } from './dto/reassign-school.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { SessionRegistryService } from '../auth/session-registry.service';
import {
  UserListResponseSchema,
  UserResponseSchema,
  UserRoleSchema,
  UserStatsSchema,
  SchoolUserBreakdownRowSchema,
} from './swagger/user-response.schema';
import { UserGender, UserManagementRole, userManagementRoleCandidates } from './enums/user.enums';

type IdentifierInput = Partial<Pick<User, 'username' | 'email' | 'phone' | 'documentNumber' | 'pinfl'>>;

/** "Faol foydalanuvchi" oynasi — oxirgi shuncha kun ichida kirganlar. */
const ACTIVE_WINDOW_DAYS = 30;

/** Maktabga bog'lanmagan hisoblar qatori (CEO, super-admin). */
const MAKTABSIZ_NOMI = '—';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  /** "Xodim" deb hisoblanmaydigan rollar — bular HR xodimlar ro'yxatiga tushmaydi. */
  private static readonly NON_STAFF_ROLE_NAMES = new Set(['student', 'parent']);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(StaffMember)
    private readonly staffMembers: Repository<StaffMember>,
    private readonly passwords: PasswordService,
    private readonly tenant: TenantContextService,
    private readonly sessionRegistry: SessionRegistryService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateUserDto,
    opts?: { skipStaffSync?: boolean },
    actor?: AuthenticatedUser,
  ): Promise<UserResponseSchema & { generatedPassword: string }> {
    const username = dto.username
      ? this.normalizeUsername(dto.username)
      : await this.generateUniqueUsername(dto.role);
    const identifiers: IdentifierInput = {
      username,
      email: this.nullableText(dto.email),
      phone: this.normalizePhone(dto.phone),
      documentNumber: this.normalizeDocumentNumber(dto.documentNumber),
      pinfl: this.nullableText(dto.pinfl),
    };

    await this.ensureUniqueIdentifiers(identifiers);
    const roles = await this.resolveRoles(dto.roleNames, dto.role);
    // Q2: yaratuvchi faqat o'z ruxsatlaridan oshmaydigan rolli akkaunt ochadi —
    // aks holda "o'zimga rol berolmasam, yangi kuchli akkaunt yarataman" yo'li
    // ochiq qolardi. Aktorsiz (ichki: seed, ota-ona provisioning) chaqiruvlarda
    // rol server kodida qat'iy — tekshiruv shart emas.
    if (actor && !isSuperAdmin(actor.permissions)) {
      assertRolesGrantable(actor.permissions, roles);
      assertPrivilegedRolesManageable(actor.permissions, roles);
    }
    const password = dto.password ?? randomBytes(18).toString('base64url');
    // Maktab/filial: yaratuvchining aktiv maktabi ustun (boshqa maktabga xodim
    // qo'shishning oldini oladi); kontekst yo'q bo'lsa (super-admin) DTO'dan olinadi.
    const schoolId = this.tenant.getSchoolId() ?? this.nullableText(dto.schoolId);
    const branchId = this.tenant.getBranchId() ?? this.nullableText(dto.branchId);
    const user = this.users.create({
      username,
      schoolId,
      branchId,
      email: identifiers.email,
      phone: identifiers.phone,
      passwordHash: await this.passwords.hash(password),
      firstName: this.normalizeText(dto.firstName),
      firstNameCyrillic: this.nullableText(dto.firstNameCyrillic),
      lastName: this.normalizeText(dto.lastName),
      lastNameCyrillic: this.nullableText(dto.lastNameCyrillic),
      middleName: this.nullableText(dto.middleName),
      middleNameCyrillic: this.nullableText(dto.middleNameCyrillic),
      birthDate: this.nullableText(dto.birthDate),
      documentNumber: identifiers.documentNumber,
      gender: dto.gender as UserGender,
      pinfl: identifiers.pinfl,
      workplace: this.nullableText(dto.workplace),
      profileImageUrl: this.nullableText(dto.profileImageUrl),
      profileImageFileId: this.nullableText(dto.profileImageFileId),
      status: CommonStatus.ACTIVE,
      roles,
    });

    const saved = await this.users.save(user);

    // Xodim rolidagi foydalanuvchi HR > Xodimlar ro'yxatida ham ko'rinishi uchun
    // ko'zgu yozuv yaratamiz. HR oqimi o'z staff yozuvini o'zi yaratadi — u yerda
    // skipStaffSync orqali ikkilanishning oldini olamiz.
    if (!opts?.skipStaffSync) {
      await this.ensureStaffMember(saved);
    }

    // The plaintext password exists only here (DB stores the argon2 hash), so it
    // is returned once for the "credentials created" dialog and never again.
    return { ...this.toUserResponse(saved), generatedPassword: password };
  }

  /** Foydalanuvchi student/parent'dan boshqa rolga ega bo'lsa — xodim hisoblanadi. */
  private isStaffUser(user: User): boolean {
    return (user.roles ?? []).some(
      (role) => !UsersService.NON_STAFF_ROLE_NAMES.has(role.name.toLowerCase()),
    );
  }

  /**
   * Xodim rolidagi foydalanuvchi uchun hr_staff_members yozuvini kafolatlaydi.
   * Bog'lanish yo'q bo'lsa minimal yozuv yaratadi (bo'lim/lavozim/maosh keyin
   * HR'da to'ldiriladi). User yaratish ushbu best-effort sinxronizatsiyaga
   * bog'liq bo'lmasligi uchun xatolik yutiladi va log qilinadi.
   */
  private async ensureStaffMember(user: User): Promise<void> {
    if (!this.isStaffUser(user)) return;
    try {
      const existing = await this.staffMembers.findOne({
        where: { userId: user.id },
        withDeleted: true,
      });
      if (existing) return;

      const employeeCode = await this.generateEmployeeCode();
      await this.staffMembers.save(
        this.staffMembers.create({
          employeeCode,
          userId: user.id,
          schoolId: user.schoolId ?? null,
          filialId: user.branchId ?? null,
          firstName: user.firstName,
          firstNameCyrillic: user.firstNameCyrillic ?? null,
          lastName: user.lastName,
          lastNameCyrillic: user.lastNameCyrillic ?? null,
          middleName: user.middleName ?? null,
          middleNameCyrillic: user.middleNameCyrillic ?? null,
          gender: user.gender ?? null,
          birthDate: user.birthDate ?? null,
          passportSeries: user.documentNumber ?? null,
          pinfl: user.pinfl ?? null,
          phone: user.phone ?? null,
          email: user.email ?? null,
          departmentId: null,
          positionId: null,
          hireDate: (user.createdAt ?? new Date()).toISOString().slice(0, 10),
          status: EmploymentStatus.ACTIVE,
          salary: 0,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Foydalanuvchi uchun xodim yozuvini yaratib bo'lmadi (userId=${user.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Keyingi bo'sh EMP-#### kodini topadi (soft-deleted'larni ham hisobga olib). */
  private async generateEmployeeCode(): Promise<string> {
    const count = await this.staffMembers.count({ withDeleted: true });
    let n = count + 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const code = `EMP-${String(n).padStart(4, '0')}`;
      const exists = await this.staffMembers.findOne({
        where: { employeeCode: code },
        withDeleted: true,
      });
      if (!exists) return code;
      n += 1;
    }
  }

  /**
   * Lightweight PARENT account creation. Guardians are contacts first, login
   * users second, so the Cyrillic name and gender are optional (the columns are
   * nullable for this role). Login + password are always auto-generated.
   */
  async createParent(input: {
    firstName: string;
    lastName?: string | null;
    middleName?: string | null;
    phone?: string | null;
    email?: string | null;
    gender?: UserGender | null;
    birthDate?: string | null;
    pinfl?: string | null;
  }): Promise<UserResponseSchema & { generatedPassword: string }> {
    const username = await this.generateUniqueUsername(UserManagementRole.PARENT);
    const identifiers: IdentifierInput = {
      username,
      email: this.nullableText(input.email),
      phone: this.normalizePhone(input.phone),
      pinfl: this.nullableText(input.pinfl),
    };
    await this.ensureUniqueIdentifiers(identifiers);
    const roles = await this.resolveRoles(undefined, UserManagementRole.PARENT);
    const password = randomBytes(18).toString('base64url');
    const user = this.users.create({
      username,
      email: identifiers.email,
      phone: identifiers.phone,
      passwordHash: await this.passwords.hash(password),
      firstName: this.normalizeText(input.firstName),
      firstNameCyrillic: null,
      lastName: input.lastName ? this.normalizeText(input.lastName) : '',
      lastNameCyrillic: null,
      middleName: this.nullableText(input.middleName),
      birthDate: this.nullableText(input.birthDate),
      gender: input.gender ?? null,
      pinfl: identifiers.pinfl,
      status: CommonStatus.ACTIVE,
      roles,
    });
    const saved = await this.users.save(user);
    return { ...this.toUserResponse(saved), generatedPassword: password };
  }

  /** Resolves a user that must carry the PARENT role; throws otherwise. */
  async findParentUser(id: string): Promise<User> {
    // `roles` qo'shilmaydi — User.roles eager:true, qo'shsak TypeORM ikki mustaqil
    // JOIN yo'lagi ochadi va natija kombinatorial ko'payadi.
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Parent user not found');
    }
    const parentRoles = this.getRoleCandidates(UserManagementRole.PARENT);
    const isParent = (user.roles ?? []).some((role) => parentRoles.includes(role.name));
    if (!isParent) {
      throw new BadRequestException('User does not have the PARENT role');
    }
    return user;
  }

  async findAll(query: Partial<UserQueryDto> = {}): Promise<UserListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('1 = 1');
    // Ko'p-maktabli ajratish: users faqat school_id (filial_id yo'q) → branch'siz.
    applyTenantScope(qb, 'user', this.tenant);
    const search = this.nullableText(query.search);

    if (search) {
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('user.username ILIKE :search', { search: `%${search}%` })
            .orWhere('user.email ILIKE :search', { search: `%${search}%` })
            .orWhere('user.phone ILIKE :search', { search: `%${search}%` })
            .orWhere('user.first_name ILIKE :search', { search: `%${search}%` })
            .orWhere('user.last_name ILIKE :search', { search: `%${search}%` })
            .orWhere('user.document_number ILIKE :search', { search: `%${search}%` })
            .orWhere('user.pinfl ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (query.role) {
      qb.andWhere('role.name IN (:...roleNames)', {
        roleNames: this.getRoleCandidates(query.role),
      });
    }

    if (query.gender) {
      qb.andWhere('user.gender = :gender', { gender: query.gender });
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.childClassId) {
      // Keeps only parents who have at least one linked student in the given
      // class — used by the parents list "Sinf" filter.
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM student_parents sp
          JOIN students s ON s.id = sp.student_id
          WHERE sp.parent_id = user.id AND s.current_class_id = :childClassId
        )`,
        { childClassId: query.childClassId },
      );
    }

    const [items, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const pageCount = Math.ceil(total / limit) || 1;
    const stats = await this.listStats();

    return {
      items: items.map((user) => this.toUserResponse(user)),
      meta: {
        page,
        limit,
        total,
        pageCount,
      },
      stats: { ...stats, pageCount },
    };
  }

  /**
   * Ro'yxat ustidagi ko'rsatkichlar — HAMMASI tenant bo'yicha filtrlanadi.
   *
   * Ilgari `this.users.count()` filtrsiz edi: maktab direktori o'z sahifasida
   * butun platformadagi 1192 raqamini ko'rardi, ro'yxat esa to'g'ri 818 ta
   * qaytarardi (2026-08-28 da aniqlandi).
   *
   * `studentCount` ATAYLAB alohida manbadan: o'quvchida login hisobi yo'q,
   * u `users` da umuman yo'q. Ikkala son bir-biriga qo'shilmaydi.
   */
  /**
   * Maktablar bo'yicha kesim — CEO "har maktabda nechta?" degan savolga javob.
   *
   * Scoping ro'yxat bilan BIR XIL qoidada: maktab konteksti bo'lsa bitta
   * qator, global hisobda hammasi + maktabga bog'lanmagan hisoblar qatori
   * (CEO/super-admin). UI kesimni faqat ikkinchi holatda chizadi.
   *
   * Bitta GROUP BY: 1 200 qatorda kesh kerak emas.
   */
  async breakdownBySchool(): Promise<SchoolUserBreakdownRowSchema[]> {
    const faolChegara = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000);
    const schoolId = this.tenant.getSchoolId();

    const hisoblar = await this.users
      .createQueryBuilder('user')
      .leftJoin('schools', 'school', 'school.id = user.school_id')
      .select('user.school_id', 'schoolId')
      .addSelect("school.name->>'uz'", 'name')
      .addSelect('COUNT(user.id)', 'accounts')
      .addSelect(
        'COUNT(user.id) FILTER (WHERE user.last_login_at > :faolChegara)',
        'active',
      )
      .setParameter('faolChegara', faolChegara)
      .where(schoolId ? 'user.school_id = :schoolId' : '1 = 1', { schoolId })
      .groupBy('user.school_id')
      .addGroupBy("school.name->>'uz'")
      .getRawMany<{ schoolId: string | null; name: string | null; accounts: string; active: string }>();

    const oquvchilar = await this.students
      .createQueryBuilder('student')
      .select('student.school_id', 'schoolId')
      .addSelect('COUNT(student.id)', 'students')
      .where(schoolId ? 'student.school_id = :schoolId' : '1 = 1', { schoolId })
      .groupBy('student.school_id')
      .getRawMany<{ schoolId: string | null; students: string }>();

    const oquvchiSoni = new Map(oquvchilar.map((r) => [r.schoolId, Number(r.students)]));

    return hisoblar
      .map((row) => ({
        schoolId: row.schoolId,
        // Maktabga bog'lanmagan hisoblar (CEO, super-admin) alohida qator.
        name: row.name ?? MAKTABSIZ_NOMI,
        accounts: Number(row.accounts),
        students: oquvchiSoni.get(row.schoolId) ?? 0,
        active: Number(row.active),
      }))
      .sort((a, b) => b.accounts - a.accounts);
  }

  private async listStats(): Promise<Omit<UserStatsSchema, 'pageCount'>> {
    const faolChegara = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000);

    const [accountCount, studentCount, activeCount] = await Promise.all([
      applyTenantScope(this.users.createQueryBuilder('user'), 'user', this.tenant).getCount(),
      applyTenantScope(this.students.createQueryBuilder('student'), 'student', this.tenant).getCount(),
      applyTenantScope(this.users.createQueryBuilder('user'), 'user', this.tenant)
        .andWhere('user.last_login_at > :faolChegara', { faolChegara })
        .getCount(),
    ]);

    return { accountCount, studentCount, activeCount };
  }

  async findOne(id: string): Promise<UserResponseSchema> {
    return this.toUserResponse(await this.findUserEntity(id));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one user field must be provided');
    }

    const user = await this.findUserEntity(id);
    const identifiers: IdentifierInput = {
      username: dto.username !== undefined ? this.normalizeUsername(dto.username) : undefined,
      email: dto.email !== undefined ? this.nullableText(dto.email) : undefined,
      phone: dto.phone !== undefined ? this.normalizePhone(dto.phone) : undefined,
      documentNumber:
        dto.documentNumber !== undefined ? this.normalizeDocumentNumber(dto.documentNumber) : undefined,
      pinfl: dto.pinfl !== undefined ? this.nullableText(dto.pinfl) : undefined,
    };
    await this.ensureUniqueIdentifiers(identifiers, id);

    if (identifiers.username !== undefined) {
      user.username = identifiers.username;
    }
    if (dto.email !== undefined) {
      user.email = identifiers.email ?? null;
    }
    if (dto.phone !== undefined) {
      user.phone = identifiers.phone ?? null;
    }
    if (dto.firstName !== undefined) {
      user.firstName = this.normalizeText(dto.firstName);
    }
    if (dto.firstNameCyrillic !== undefined) {
      user.firstNameCyrillic = this.nullableText(dto.firstNameCyrillic);
    }
    if (dto.lastName !== undefined) {
      user.lastName = this.normalizeText(dto.lastName);
    }
    if (dto.lastNameCyrillic !== undefined) {
      user.lastNameCyrillic = this.nullableText(dto.lastNameCyrillic);
    }
    if (dto.middleName !== undefined) {
      user.middleName = this.nullableText(dto.middleName);
    }
    if (dto.middleNameCyrillic !== undefined) {
      user.middleNameCyrillic = this.nullableText(dto.middleNameCyrillic);
    }
    if (dto.birthDate !== undefined) {
      user.birthDate = this.nullableText(dto.birthDate);
    }
    if (dto.documentNumber !== undefined) {
      user.documentNumber = identifiers.documentNumber ?? null;
    }
    if (dto.gender !== undefined) {
      user.gender = dto.gender as UserGender;
    }
    if (dto.pinfl !== undefined) {
      user.pinfl = identifiers.pinfl ?? null;
    }
    if (dto.workplace !== undefined) {
      user.workplace = this.nullableText(dto.workplace);
    }
    if (dto.profileImageUrl !== undefined) {
      user.profileImageUrl = this.nullableText(dto.profileImageUrl);
    }
    if (dto.profileImageFileId !== undefined) {
      user.profileImageFileId = this.nullableText(dto.profileImageFileId);
    }
    if (dto.status !== undefined) {
      user.status = dto.status;
    }
    // Rol, parol va maktab/filial bu yerda ATAYLAB yo'q (T-02 + tenant
    // izolyatsiya tuzatishi): rol — `assignRoles` (`roles.assign`), parol —
    // `resetPassword` (`users.reset-password`), maktab ko'chirish —
    // `reassignSchool` (`users.reassign-school`, faqat super-admin).
    const saved = await this.users.save(user);
    return this.toUserResponse(saved);
  }

  /**
   * Administrator tomonidan parol tiklash. Q2': nishonning ruxsatlari
   * aktornikidan oshmasligi shart — parol tiklash o'sha akkaunt nomidan
   * kirish bilan barobar. Q3: o'z paroli uchun /auth/change-password.
   * Muvaffaqiyatda nishonning barcha faol sessiyalari bekor qilinadi.
   */
  async resetPassword(
    id: string,
    password: string,
    actor: AuthenticatedUser,
  ): Promise<{ changed: true; revokedSessions: number }> {
    const user = await this.findUserEntity(id);
    if (!isSuperAdmin(actor.permissions)) {
      assertNotSelf(actor.id, id, 'parol');
      assertPasswordResettable(actor.permissions, user.roles ?? []);
    }

    user.passwordHash = await this.passwords.hash(password);
    await this.users.save(user);
    // "Parolimni kimdir bilib qoldi" stsenariysining to'g'ridan-to'g'ri davosi:
    // eski parol bilan ochilgan sessiyalar darhol o'ladi.
    const revokedSessions = await this.sessionRegistry.revokeAllForUser(user.id);
    await this.audit.log({
      userId: actor.id,
      action: 'user.password_reset',
      entity: 'user',
      entityId: user.id,
    });
    return { changed: true, revokedSessions };
  }

  async remove(id: string): Promise<void> {
    await this.findUserEntity(id);
    await this.users.softDelete(id);
  }

  async assignRoles(
    id: string,
    dto: AssignRolesDto,
    actor?: AuthenticatedUser,
  ): Promise<UserResponseSchema> {
    const user = await this.findUserEntity(id);
    const roles = await this.resolveRoles(dto.roleNames);
    if (actor && !isSuperAdmin(actor.permissions)) {
      // Q3 avval: o'ziga rol yozish Q2 ni aylanib o'tishning eng qisqa yo'li.
      assertNotSelf(actor.id, id, 'rol');
      assertRolesGrantable(actor.permissions, roles);
      assertPrivilegedRolesManageable(actor.permissions, roles);
    }
    user.roles = roles;
    const saved = await this.users.save(user);
    if (actor) {
      await this.audit.log({
        userId: actor.id,
        action: 'user.roles_assigned',
        entity: 'user',
        entityId: user.id,
        details: { roles: dto.roleNames },
      });
    }
    return this.toUserResponse(saved);
  }

  /**
   * Foydalanuvchini boshqa maktab/filialga ko'chirish — tenant chegarasini
   * kesib o'tuvchi yagona amal. Faqat super-admin (ikki qavat himoya:
   * `@Permissions([USERS_REASSIGN_SCHOOL])` controller darajasida — bu kod
   * hech qanday standart rolga berilmaydi — va bu yerda `isSuperAdmin`
   * qo'shimcha tekshiruvi, agar kimdir maxsus rolga shu kodni qo'lda
   * biriktirib qo'ysa ham). `findUserEntity` emas — nishon ATAYLAB
   * tenant filtrisiz izlanadi, chunki super-admin har qanday maktabdagi
   * foydalanuvchini ko'chira olishi kerak.
   */
  async reassignSchool(
    id: string,
    dto: ReassignSchoolDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseSchema> {
    if (!isSuperAdmin(actor.permissions)) {
      throw new ForbiddenException(
        'Foydalanuvchini boshqa maktabga faqat super-admin ko\'chira oladi.',
      );
    }
    const user = await this.users.findOne({ where: { id } }); // roles eager:true, qayta so'ramaymiz
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fromSchoolId = user.schoolId;
    user.schoolId = this.nullableText(dto.schoolId);
    user.branchId = dto.branchId !== undefined ? this.nullableText(dto.branchId) : null;
    const saved = await this.users.save(user);

    await this.audit.log({
      userId: actor.id,
      action: 'user.school_reassigned',
      entity: 'user',
      entityId: user.id,
      details: { fromSchoolId, toSchoolId: dto.schoolId, toBranchId: dto.branchId ?? null },
    });

    return this.toUserResponse(saved);
  }

  private async findUserEntity(id: string): Promise<User> {
    // roles eager:true, qayta so'ramaymiz (ikki marta join — kombinatorial portlash).
    const user = await this.users.findOne({
      where: tenantWhere<User>(this.tenant, { id }, { branch: true }),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureUniqueIdentifiers(
    identifiers: Partial<IdentifierInput>,
    excludeUserId?: string,
  ): Promise<void> {
    const where: FindOptionsWhere<User>[] = [];
    const exclude = excludeUserId ? { id: Not(excludeUserId) } : {};

    if (identifiers.username) {
      where.push({ ...exclude, username: identifiers.username });
    }
    if (identifiers.email) {
      where.push({ ...exclude, email: identifiers.email });
    }
    if (identifiers.phone) {
      where.push({ ...exclude, phone: identifiers.phone });
    }
    if (identifiers.documentNumber) {
      where.push({ ...exclude, documentNumber: identifiers.documentNumber });
    }
    if (identifiers.pinfl) {
      where.push({ ...exclude, pinfl: identifiers.pinfl });
    }
    if (where.length === 0) {
      return;
    }

    const existing = await this.users.findOne({ where });
    if (existing) {
      throw new ConflictException('User with this identity fields already exists');
    }
  }

  private async resolveRoles(
    roleNames?: string[],
    role?: UserManagementRole | string,
  ): Promise<Role[]> {
    const requestedRoles = roleNames?.length ? roleNames : [role ?? UserManagementRole.STUDENT];
    const resolvedRoles: Role[] = [];
    const missingRoles: string[] = [];

    // Rol qidiruvi tenant chegarasida: global (tizim) rollar + aktiv maktab
    // rollari. Busiz bir maktab admini boshqa maktabning bir xil nomli rolini
    // biriktirib yuborishi mumkin edi (RolesService.tenantRoleWhere bilan mos).
    const schoolId = this.tenant.getSchoolId();
    const roleWhere = (candidates: string[]): FindOptionsWhere<Role>[] =>
      schoolId
        ? [
            { name: In(candidates), schoolId: IsNull() },
            { name: In(candidates), schoolId },
          ]
        : [{ name: In(candidates) }];

    for (const requestedRole of requestedRoles) {
      const candidates = this.getRoleCandidates(requestedRole);
      const foundRoles = await this.roles.find({ where: roleWhere(candidates) });
      const selectedRole = candidates
        .map((candidate) => foundRoles.find((foundRole) => foundRole.name === candidate))
        .find(Boolean);

      if (!selectedRole) {
        missingRoles.push(String(requestedRole));
        continue;
      }

      if (!resolvedRoles.some((resolvedRole) => resolvedRole.id === selectedRole.id)) {
        resolvedRoles.push(selectedRole);
      }
    }

    if (missingRoles.length > 0) {
      throw new NotFoundException(`Unknown roles: ${missingRoles.join(', ')}`);
    }

    return resolvedRoles;
  }

  private getRoleCandidates(role: UserManagementRole | string): string[] {
    const rawRole = String(role).trim();
    const managementRole = rawRole.toUpperCase() as UserManagementRole;

    if (Object.values(UserManagementRole).includes(managementRole)) {
      return userManagementRoleCandidates[managementRole];
    }

    return [this.normalizeRoleName(rawRole)];
  }

  private async generateUniqueUsername(role?: UserManagementRole | string): Promise<string> {
    const prefixByRole: Record<UserManagementRole, string> = {
      [UserManagementRole.ADMIN]: 'A',
      [UserManagementRole.SALES_MANAGER]: 'SM',
      [UserManagementRole.STUDENT]: 'S',
      [UserManagementRole.PARENT]: 'P',
      [UserManagementRole.TEACHER]: 'T',
      [UserManagementRole.TUTOR]: 'TU',
      [UserManagementRole.SUPERMANAGER]: 'SU',
      [UserManagementRole.OPERATOR]: 'OP',
      [UserManagementRole.ACCOUNTANT]: 'AC',
    };
    const roleKey = String(role ?? UserManagementRole.STUDENT).toUpperCase() as UserManagementRole;
    const prefix = prefixByRole[roleKey] ?? 'U';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const username = `${prefix}${randomBytes(3).toString('hex').toUpperCase()}`;
      const existing = await this.users.findOne({ where: { username } });

      if (!existing) {
        return username;
      }
    }

    return `${prefix}${Date.now()}`;
  }

  private toUserResponse(user: User): UserResponseSchema {
    const roles = this.toRoleResponses(user.roles ?? []);
    const firstName = user.firstName ?? '';
    const lastName = user.lastName ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || user.username;

    return {
      id: user.id,
      login: user.username,
      fullName,
      firstName,
      firstNameCyrillic: user.firstNameCyrillic ?? '',
      lastName,
      lastNameCyrillic: user.lastNameCyrillic ?? '',
      middleName: user.middleName ?? null,
      middleNameCyrillic: user.middleNameCyrillic ?? null,
      birthDate: this.formatDateOnly(user.birthDate),
      documentNumber: user.documentNumber ?? null,
      gender: (user.gender ?? UserGender.MALE) as UserGender,
      phone: user.phone ?? null,
      email: user.email ?? null,
      pinfl: user.pinfl ?? null,
      workplace: user.workplace ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      profileImageFileId: user.profileImageFileId ?? null,
      schoolId: user.schoolId ?? null,
      branchId: user.branchId ?? null,
      role: roles[0]?.name ?? null,
      roles,
      status: user.status ?? CommonStatus.ACTIVE,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      version: user.version,
    };
  }

  private toRoleResponses(roles: Role[]): UserRoleSchema[] {
    return roles.map((role) => ({
      name: role.name,
      title: role.title?.uz ?? role.title?.en ?? role.name,
    }));
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = this.normalizeText(value);
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizePhone(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const phone = value.replace(/[\s()-]/g, '');
    return phone.length > 0 ? phone : null;
  }

  private normalizeDocumentNumber(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const documentNumber = value.trim().replace(/\s+/g, '').toUpperCase();
    return documentNumber.length > 0 ? documentNumber : null;
  }

  private normalizeRoleName(value: string): string {
    return value.trim().toLowerCase().replace(/_/g, '-');
  }

  private formatDateOnly(value?: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value;
  }
}
