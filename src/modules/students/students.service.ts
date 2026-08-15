import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { createPage, PageDto } from '../../common/dto/page.dto';
import { AccessScopeService } from '../../common/scope/access-scope.service';
import { applyOwnershipScope } from '../../common/scope/data-scope.util';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope } from '../../common/tenant/tenant-scope.util';
import { UsersService } from '../users/users.service';
import { UserGender } from '../users/enums/user.enums';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';
import { QueryDepartedDto } from './dto/query-departed.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentAdmission } from './entities/student-admission.entity';
import { StudentDocument } from './entities/student-document.entity';
import { StudentParent } from './entities/student-parent.entity';
import { Student } from './entities/student.entity';
import { Gender, StudentStatus } from './enums/student-status.enum';

export interface StudentStats {
  total: number;
  male: number;
  female: number;
  newThisMonth: number;
}

export interface DepartedStats {
  total: number;
  male: number;
  female: number;
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(StudentParent)
    private readonly studentParents: Repository<StudentParent>,
    @InjectRepository(StudentDocument)
    private readonly documents: Repository<StudentDocument>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly tenant: TenantContextService,
    private readonly accessScope: AccessScopeService,
    private readonly auditService?: AuditService,
  ) {}

  // ----------------------------------------------------------------- Enroll (CRM)

  /**
   * Atomically enroll a student from an admission form: creates the Student,
   * a guardian Parent + link, and the rich StudentAdmission record in one
   * transaction. `studentCode` is generated; returns the saved student.
   */
  async enrollStudent(dto: EnrollStudentDto, leadId?: string): Promise<Student> {
    return this.dataSource.transaction(async (manager) => {
      const studentCode = await this.generateStudentCode(manager.getRepository(Student));

      const student = await manager.getRepository(Student).save(
        manager.getRepository(Student).create({
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName ?? null,
          birthDate: dto.birthDate,
          gender: dto.gender ?? null,
          studentCode,
          status: StudentStatus.ACTIVE,
          schoolId: this.tenant.getSchoolId(),
          filialId: this.tenant.getBranchId(),
          nationalId: dto.jshshir ?? null,
          region: dto.region ?? null,
          district: dto.district ?? null,
          address: dto.address ?? null,
          personalPhone: dto.personalPhone ?? null,
        }),
      );

      await this.attachGuardian(manager, student.id, dto.guardianFullName, dto.guardianPhone, dto.guardianRelation);

      await manager.getRepository(StudentAdmission).save(
        manager.getRepository(StudentAdmission).create({
          studentId: student.id,
          leadId: leadId ?? null,
          middleName: dto.middleName ?? null,
          nationality: dto.nationality ?? null,
          birthCertificateSeries: dto.birthCertificateSeries,
          birthCertificateNumber: dto.birthCertificateNumber,
          passport: dto.passport ?? null,
          jshshir: dto.jshshir ?? null,
          passportIssuedDate: dto.passportIssuedDate ?? null,
          guardianFullName: dto.guardianFullName,
          guardianRelation: dto.guardianRelation ?? null,
          guardianPassport: dto.guardianPassport ?? null,
          guardianJshshir: dto.guardianJshshir ?? null,
          guardianPhone: dto.guardianPhone,
          region: dto.region ?? null,
          district: dto.district ?? null,
          address: dto.address ?? null,
          personalPhone: dto.personalPhone ?? null,
        }),
      );

      return student;
    });
  }

  /**
   * Creates a guardian PARENT user + primary StudentParent link from a full name
   * and phone. The user is provisioned via UsersService (auto login/password);
   * Cyrillic name and gender stay null until the parent profile is completed.
   */
  private async attachGuardian(
    manager: EntityManager,
    studentId: string,
    fullName: string,
    phone: string,
    relation?: string | null,
  ): Promise<void> {
    const [guardianFirst, ...guardianRest] = fullName.trim().split(/\s+/);
    const parent = await this.usersService.createParent({
      firstName: guardianFirst,
      lastName: guardianRest.join(' ') || null,
      phone,
    });

    await manager.getRepository(StudentParent).save(
      manager.getRepository(StudentParent).create({
        studentId,
        parentId: parent.id,
        relation: relation ?? 'guardian',
        isPrimary: true,
      }),
    );
  }

  /** Sequential code per year: `ST-2026-0001`. */
  private async generateStudentCode(repo: Repository<Student>): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ST-${year}-`;
    const count = await repo
      .createQueryBuilder('student')
      .withDeleted()
      .where('student.student_code LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // ----------------------------------------------------------------- CRUD

  async createStudent(dto: CreateStudentDto): Promise<Student> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Student);
      const studentCode = dto.studentCode ?? (await this.generateStudentCode(repo));

      const student = await repo.save(
        repo.create({
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName ?? null,
          birthDate: dto.birthDate ?? null,
          gender: dto.gender ?? null,
          preferredLanguage: dto.preferredLanguage,
          photoUrl: dto.photoUrl ?? null,
          studentCode,
          status: dto.status ?? StudentStatus.ACTIVE,
          schoolId: this.tenant.getSchoolId(),
          filialId: this.tenant.getBranchId(),
          nationalId: dto.nationalId ?? null,
          currentClassId: dto.currentClassId ?? null,
          contractNumber: dto.contractNumber ?? null,
          discountPercent: dto.discountPercent ?? 0,
          monthlyFee: dto.monthlyFee ?? 0,
          discountType: dto.discountType ?? "percent",
          discountValue: dto.discountValue ?? dto.discountPercent ?? 0,
          billingStartDate: dto.billingStartDate ?? null,
          paymentPlan: dto.paymentPlan ?? null,
          planDiscountOverrideType: dto.planDiscountOverrideType ?? null,
          planDiscountOverrideValue: dto.planDiscountOverrideValue ?? null,
          region: dto.region ?? null,
          district: dto.district ?? null,
          address: dto.address ?? null,
          personalPhone: dto.personalPhone ?? null,
          interests: dto.interests ?? [],
          extraDocuments: dto.extraDocuments ?? {},
        }),
      );

      if (dto.guardianFullName && dto.guardianPhone) {
        await this.attachGuardian(
          manager,
          student.id,
          dto.guardianFullName,
          dto.guardianPhone,
          dto.guardianRelation,
        );
      }

      await this.audit('student.create', student.id, { studentCode });
      return repo.findOneOrFail({ where: { id: student.id }, relations: { currentClass: true } });
    });
  }

  // ------------------------------------------------------ Qator darajasidagi egalik

  /**
   * Egalik filtri — tenant filtridan KEYIN, uning ustiga qo'yiladi.
   *
   * Doira `ALL` bo'lsa hech nima qo'shilmaydi (eski xulq). `OWN` bo'lsa
   * o'quvchi faqat ikki yo'ldan biri orqali ko'rinadi: mening sinfimda
   * o'qiydi YOKI mening farzandim. Ikkalasi ham bo'sh bo'lsa — hech narsa
   * qaytmaydi (`applyOwnershipScope` `1 = 0` qo'yadi).
   */
  private async applyOwnership(
    qb: SelectQueryBuilder<Student>,
    alias = 'student',
  ): Promise<void> {
    if (!this.accessScope.isRestricted()) return;
    const own = await this.accessScope.resolveOwnScope();
    applyOwnershipScope(qb, alias, [
      { column: 'current_class_id', values: own.classIds },
      { column: 'id', values: own.studentIds },
    ]);
  }

  async findStudents(query: QueryStudentsDto): Promise<PageDto<Student>> {
    const qb = this.students
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.currentClass', 'currentClass')
      .leftJoinAndSelect('student.parents', 'sp')
      .leftJoinAndSelect('sp.parent', 'parent')
      .orderBy('student.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    applyTenantScope(qb, 'student', this.tenant, { branch: true });
    await this.applyOwnership(qb);

    if (query.status) qb.andWhere('student.status = :status', { status: query.status });
    if (query.gender) qb.andWhere('student.gender = :gender', { gender: query.gender });
    if (query.classId) qb.andWhere('student.current_class_id = :classId', { classId: query.classId });

    if (query.search) {
      const q = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(student.first_name) LIKE :q', { q })
            .orWhere('LOWER(student.last_name) LIKE :q', { q })
            .orWhere('LOWER(student.middle_name) LIKE :q', { q })
            .orWhere('LOWER(student.student_code) LIKE :q', { q })
            .orWhere('student.personal_phone LIKE :q', { q })
            .orWhere(
              `EXISTS (
                SELECT 1 FROM student_parents esp
                JOIN users ep ON ep.id = esp.parent_id
                WHERE esp.student_id = student.id AND ep.phone LIKE :q
              )`,
              { q },
            );
        }),
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return createPage(items, total, query.page, query.limit);
  }

  async getStats(): Promise<StudentStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Kartochkalardagi raqamlar ro'yxat bilan bir xil chegarada bo'lishi shart:
    // aks holda o'qituvchi 12 ta o'quvchi ko'rib turib "jami 640" yozuvini
    // o'qirdi — bu ham sirni oshkor qilish, ham ishonchni yo'qotish.
    const base = async (): Promise<SelectQueryBuilder<Student>> => {
      const qb = this.students.createQueryBuilder('student');
      applyTenantScope(qb, 'student', this.tenant, { branch: true });
      await this.applyOwnership(qb);
      return qb;
    };

    const [total, male, female, newThisMonth] = await Promise.all([
      base().then((qb) => qb.getCount()),
      base().then((qb) =>
        qb.andWhere('student.gender = :gender', { gender: Gender.MALE }).getCount(),
      ),
      base().then((qb) =>
        qb.andWhere('student.gender = :gender', { gender: Gender.FEMALE }).getCount(),
      ),
      base().then((qb) =>
        qb.andWhere('student.created_at >= :monthStart', { monthStart }).getCount(),
      ),
    ]);

    return { total, male, female, newThisMonth };
  }

  /**
   * Bitta o'quvchi. Doiradan tashqaridagi yozuv uchun ataylab 404 (403 emas):
   * 403 "bunday o'quvchi bor, lekin senga ko'rsatmayman" degani bo'lardi,
   * ya'ni mavjudlik faktini oshkor qilardi.
   */
  async findStudent(id: string): Promise<Student> {
    const qb = this.students
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.parents', 'sp')
      .leftJoinAndSelect('sp.parent', 'parent')
      .leftJoinAndSelect('student.documents', 'documents')
      .leftJoinAndSelect('student.currentClass', 'currentClass')
      .where('student.id = :id', { id });
    applyTenantScope(qb, 'student', this.tenant, { branch: true });
    await this.applyOwnership(qb);

    const student = await qb.getOne();
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async updateStudent(id: string, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findStudent(id);
    const {
      guardianFullName: _gn,
      guardianPhone: _gp,
      guardianRelation: _gr,
      ...patch
    } = dto;
    Object.assign(student, patch);
    const saved = await this.students.save(student);
    await this.audit('student.update', id, { fields: Object.keys(patch) });
    return saved;
  }

  async removeStudent(id: string, reason?: string): Promise<{ id: string }> {
    const student = await this.findStudent(id);
    const trimmed = reason?.trim();
    if (trimmed) {
      student.withdrawalReason = trimmed;
      await this.students.save(student);
    }
    await this.students.softRemove(student);
    await this.audit('student.delete', id, trimmed ? { reason: trimmed } : undefined);
    return { id };
  }

  // ----------------------------------------------------------------- Ketgan o‘quvchilar

  /**
   * Soft-delete qilingan (ketgan) o‘quvchilar ro‘yxati — `deleted_at IS NOT NULL`.
   * Jins / sinf / qidiruv bo‘yicha filtr, eng yangi ketganlar yuqorida.
   */
  async findDeparted(query: QueryDepartedDto): Promise<PageDto<Student>> {
    const qb = this.students
      .createQueryBuilder('student')
      .withDeleted()
      .leftJoinAndSelect('student.currentClass', 'currentClass')
      .where('student.deleted_at IS NOT NULL')
      .orderBy('student.deletedAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    applyTenantScope(qb, 'student', this.tenant, { branch: true });
    await this.applyOwnership(qb);

    if (query.gender) qb.andWhere('student.gender = :gender', { gender: query.gender });
    if (query.classId) qb.andWhere('student.current_class_id = :classId', { classId: query.classId });

    if (query.search) {
      const q = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(student.first_name) LIKE :q', { q })
            .orWhere('LOWER(student.last_name) LIKE :q', { q })
            .orWhere('LOWER(student.middle_name) LIKE :q', { q })
            .orWhere('LOWER(student.student_code) LIKE :q', { q })
            .orWhere('student.personal_phone LIKE :q', { q });
        }),
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return createPage(items, total, query.page, query.limit);
  }

  /** Ketgan o‘quvchilar statistikasi (jami / erkak / ayol). */
  async getDepartedStats(): Promise<DepartedStats> {
    const base = async (): Promise<SelectQueryBuilder<Student>> => {
      const qb = this.students
        .createQueryBuilder('student')
        .withDeleted()
        .where('student.deleted_at IS NOT NULL');
      applyTenantScope(qb, 'student', this.tenant, { branch: true });
      await this.applyOwnership(qb);
      return qb;
    };

    const [total, male, female] = await Promise.all([
      base().then((qb) => qb.getCount()),
      base().then((qb) =>
        qb.andWhere('student.gender = :gender', { gender: Gender.MALE }).getCount(),
      ),
      base().then((qb) =>
        qb.andWhere('student.gender = :gender', { gender: Gender.FEMALE }).getCount(),
      ),
    ]);

    return { total, male, female };
  }

  /** Ketgan o‘quvchini tiklaydi (soft-delete bekor qilinadi). */
  async restoreStudent(id: string): Promise<{ id: string }> {
    const student = await this.findDeletedInScope(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (!student.deletedAt) {
      throw new BadRequestException('Student is not departed');
    }
    student.withdrawalReason = null;
    await this.students.save(student);
    await this.students.recover(student);
    await this.audit('student.restore', id);
    return { id };
  }

  /**
   * O'chirilgan o'quvchini tenant + egalik chegarasida topadi. Tiklash va
   * butunlay o'chirish uchun umumiy — ikkalasi ham \"ko'rmaydigan\" yozuvga
   * ta'sir qila olmasligi kerak.
   */
  private async findDeletedInScope(id: string): Promise<Student | null> {
    const qb = this.students
      .createQueryBuilder('student')
      .withDeleted()
      .where('student.id = :id', { id });
    applyTenantScope(qb, 'student', this.tenant, { branch: true });
    await this.applyOwnership(qb);
    return qb.getOne();
  }

  /** Ketgan o‘quvchini butunlay (qaytarib bo‘lmaydigan) o‘chiradi. */
  async permanentlyRemoveStudent(id: string): Promise<{ id: string }> {
    const student = await this.findDeletedInScope(id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (!student.deletedAt) {
      throw new BadRequestException('Only departed students can be permanently deleted');
    }
    await this.students.remove(student);
    await this.audit('student.delete.permanent', id);
    return { id };
  }

  // ----------------------------------------------------------------- Parents

  /**
   * Creates a standalone PARENT user account. Returns the user together with the
   * one-time generated password for the "credentials created" dialog.
   */
  async createParent(dto: CreateParentDto) {
    const parent = await this.usersService.createParent({
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      gender: dto.gender as UserGender | undefined,
    });
    await this.audit('parent.create', parent.id, { phone: dto.phone });
    return parent;
  }

  async linkParent(studentId: string, dto: LinkParentDto): Promise<StudentParent> {
    await this.findStudent(studentId);
    // Validates the target is a real PARENT user (throws 404/400 otherwise).
    await this.usersService.findParentUser(dto.parentId);

    const existing = await this.studentParents.findOne({
      where: { studentId, parentId: dto.parentId },
    });

    const relation = existing ?? this.studentParents.create({ studentId, parentId: dto.parentId });
    relation.relation = dto.relation;
    relation.isPrimary = dto.isPrimary ?? false;

    const saved = await this.studentParents.save(relation);
    await this.audit('student.parent.link', studentId, { parentId: dto.parentId });
    return saved;
  }

  /** Removes a parent ↔ student link (the parent user account is kept). */
  async unlinkParent(studentId: string, parentId: string): Promise<{ id: string }> {
    const link = await this.studentParents.findOne({ where: { studentId, parentId } });
    if (!link) {
      throw new NotFoundException('Student-parent link not found');
    }
    await this.studentParents.remove(link);
    await this.audit('student.parent.unlink', studentId, { parentId });
    return { id: parentId };
  }

  /** Students linked to a given parent user (for the parent's "children" tab). */
  async findChildren(parentId: string): Promise<Student[]> {
    const links = await this.studentParents.find({
      where: { parentId },
      relations: { student: { currentClass: true } },
    });
    return links.map((link) => link.student).filter(Boolean);
  }

  /**
   * Batched children lookup for the parents list "Farzandlar" column — one query
   * for the whole page instead of N requests.
   */
  async childrenByParents(parentIds: string[]): Promise<Record<string, Student[]>> {
    if (parentIds.length === 0) {
      return {};
    }
    const links = await this.studentParents.find({
      where: { parentId: In(parentIds) },
      relations: { student: { currentClass: true } },
    });
    const map: Record<string, Student[]> = {};
    for (const link of links) {
      if (!link.student) continue;
      (map[link.parentId] ??= []).push(link.student);
    }
    return map;
  }

  // ----------------------------------------------------------------- Hujjatlar

  async listDocuments(studentId: string): Promise<StudentDocument[]> {
    await this.findStudent(studentId);
    return this.documents.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addDocument(studentId: string, dto: CreateDocumentDto): Promise<StudentDocument> {
    await this.findStudent(studentId);
    const doc = await this.documents.save(
      this.documents.create({ studentId, type: dto.type, fileUrl: dto.fileUrl }),
    );
    await this.audit('student.document.add', studentId, { type: dto.type });
    return doc;
  }

  async removeDocument(studentId: string, documentId: string): Promise<{ id: string }> {
    const doc = await this.documents.findOne({ where: { id: documentId, studentId } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    await this.documents.softRemove(doc);
    await this.audit('student.document.remove', studentId, { documentId });
    return { id: documentId };
  }

  // ----------------------------------------------------------------- Helpers

  private async audit(
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService?.log({ action, entity: 'student', entityId, details });
    } catch (error) {
      this.logger.warn(
        `Failed to write student audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
