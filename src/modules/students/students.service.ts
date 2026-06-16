import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createPage, PageDto } from '../../common/dto/page.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';
import { Parent } from './entities/parent.entity';
import { StudentAdmission } from './entities/student-admission.entity';
import { StudentParent } from './entities/student-parent.entity';
import { Student } from './entities/student.entity';
import { StudentStatus } from './enums/student-status.enum';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parents: Repository<Parent>,
    @InjectRepository(StudentParent)
    private readonly studentParents: Repository<StudentParent>,
    private readonly dataSource: DataSource,
  ) {}

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
          birthDate: dto.birthDate,
          gender: dto.gender ?? null,
          studentCode,
          status: StudentStatus.ACTIVE,
          nationalId: dto.jshshir ?? null,
        }),
      );

      const [guardianFirst, ...guardianRest] = dto.guardianFullName.trim().split(/\s+/);
      const parent = await manager.getRepository(Parent).save(
        manager.getRepository(Parent).create({
          firstName: guardianFirst,
          lastName: guardianRest.join(' ') || null,
          phone: dto.guardianPhone,
        }),
      );

      await manager.getRepository(StudentParent).save(
        manager.getRepository(StudentParent).create({
          studentId: student.id,
          parentId: parent.id,
          relation: dto.guardianRelation ?? 'guardian',
          isPrimary: true,
        }),
      );

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

  async createStudent(dto: CreateStudentDto): Promise<Student> {
    return this.students.save(this.students.create(dto));
  }

  async findStudents(query: PaginationQueryDto): Promise<PageDto<Student>> {
    const [items, total] = await this.students.findAndCount({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { createdAt: 'DESC' },
      relations: { parents: { parent: true } },
    });

    return createPage(items, total, query.page, query.limit);
  }

  async findStudent(id: string): Promise<Student> {
    const student = await this.students.findOne({
      where: { id },
      relations: { parents: { parent: true }, documents: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async updateStudent(id: string, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findStudent(id);
    Object.assign(student, dto);
    return this.students.save(student);
  }

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
}
