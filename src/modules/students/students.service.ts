import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createPage, PageDto } from '../../common/dto/page.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Parent } from './entities/parent.entity';
import { StudentParent } from './entities/student-parent.entity';
import { Student } from './entities/student.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parents: Repository<Parent>,
    @InjectRepository(StudentParent)
    private readonly studentParents: Repository<StudentParent>,
  ) {}

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
