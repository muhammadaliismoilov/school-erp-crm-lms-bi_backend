import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { createPage, PageDto } from '../../common/dto/page.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Parent } from './entities/parent.entity';
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

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parents: Repository<Parent>,
    @InjectRepository(StudentParent)
    private readonly studentParents: Repository<StudentParent>,
    @InjectRepository(StudentDocument)
    private readonly documents: Repository<StudentDocument>,
    private readonly dataSource: DataSource,
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

  /** Creates a guardian Parent + primary StudentParent link from a full name + phone. */
  private async attachGuardian(
    manager: EntityManager,
    studentId: string,
    fullName: string,
    phone: string,
    relation?: string | null,
  ): Promise<void> {
    const [guardianFirst, ...guardianRest] = fullName.trim().split(/\s+/);
    const parent = await manager.getRepository(Parent).save(
      manager.getRepository(Parent).create({
        firstName: guardianFirst,
        lastName: guardianRest.join(' ') || null,
        phone,
      }),
    );

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
          nationalId: dto.nationalId ?? null,
          currentClassId: dto.currentClassId ?? null,
          contractNumber: dto.contractNumber ?? null,
          discountPercent: dto.discountPercent ?? 0,
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

  async findStudents(query: QueryStudentsDto): Promise<PageDto<Student>> {
    const qb = this.students
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.currentClass', 'currentClass')
      .leftJoinAndSelect('student.parents', 'sp')
      .leftJoinAndSelect('sp.parent', 'parent')
      .orderBy('student.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

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
                JOIN parents ep ON ep.id = esp.parent_id
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

    const [total, male, female, newThisMonth] = await Promise.all([
      this.students.count(),
      this.students.count({ where: { gender: Gender.MALE } }),
      this.students.count({ where: { gender: Gender.FEMALE } }),
      this.students
        .createQueryBuilder('student')
        .where('student.created_at >= :monthStart', { monthStart })
        .getCount(),
    ]);

    return { total, male, female, newThisMonth };
  }

  async findStudent(id: string): Promise<Student> {
    const student = await this.students.findOne({
      where: { id },
      relations: { parents: { parent: true }, documents: true, currentClass: true },
    });
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

  async removeStudent(id: string): Promise<{ id: string }> {
    const student = await this.findStudent(id);
    await this.students.softRemove(student);
    await this.audit('student.delete', id);
    return { id };
  }

  // ----------------------------------------------------------------- Parents

  async createParent(dto: CreateParentDto): Promise<Parent> {
    return this.parents.save(this.parents.create(dto));
  }

  async linkParent(studentId: string, dto: LinkParentDto): Promise<StudentParent> {
    await this.findStudent(studentId);
    const parent = await this.parents.findOne({ where: { id: dto.parentId } });
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const existing = await this.studentParents.findOne({
      where: { studentId, parentId: dto.parentId },
    });

    const relation = existing ?? this.studentParents.create({ studentId, parentId: dto.parentId });
    relation.relation = dto.relation;
    relation.isPrimary = dto.isPrimary ?? false;

    return this.studentParents.save(relation);
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
