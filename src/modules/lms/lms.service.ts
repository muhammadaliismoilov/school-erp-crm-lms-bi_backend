import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { Quarter } from '../academic/entities/quarter.entity';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import { CreateExamDto, CreateExamResultDto, CreateJournalEntryDto, CreateLessonScheduleDto, UpdateExamDto, UpdateExamResultDto, UpdateJournalEntryDto, UpdateLessonScheduleDto } from './dto/lms.dto';
import { GradebookQueryDto, GradebookResponseDto, UpsertGradeDto } from './dto/gradebook.dto';
import { ExamResult } from './entities/exam-result.entity';
import { Exam } from './entities/exam.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';

@Injectable()
export class LmsService {
  constructor(@InjectRepository(LessonSchedule) private readonly lessons: Repository<LessonSchedule>, @InjectRepository(JournalEntry) private readonly journal: Repository<JournalEntry>, @InjectRepository(Exam) private readonly exams: Repository<Exam>, @InjectRepository(ExamResult) private readonly results: Repository<ExamResult>, @InjectRepository(Student) private readonly students: Repository<Student>, @InjectRepository(Quarter) private readonly quarters: Repository<Quarter>) {}
  createLesson(dto: CreateLessonScheduleDto) { return this.lessons.save(this.lessons.create(dto)); }
  findLessons() { return this.lessons.find({ relations: { class: true, subject: true, teacher: true, room: true, lessonPeriod: true }, order: { lessonDate: 'DESC' } }); }
  updateLesson(id: string, dto: UpdateLessonScheduleDto) { return this.update(this.lessons, id, dto); }
  createJournalEntry(dto: CreateJournalEntryDto) { return this.journal.save(this.journal.create({ ...dto, homeworkDone: dto.homeworkDone ?? false })); }
  findJournalEntries() { return this.journal.find({ relations: { lesson: true, student: true }, order: { createdAt: 'DESC' } }); }
  updateJournalEntry(id: string, dto: UpdateJournalEntryDto) { return this.update(this.journal, id, dto); }
  createExam(dto: CreateExamDto) { return this.exams.save(this.exams.create(dto)); }
  findExams() { return this.exams.find({ relations: { class: true, subject: true, results: true }, order: { examDate: 'DESC' } }); }
  updateExam(id: string, dto: UpdateExamDto) { return this.update(this.exams, id, dto); }
  createExamResult(dto: CreateExamResultDto) { return this.results.save(this.results.create(dto)); }
  findExamResults() { return this.results.find({ relations: { exam: true, student: true }, order: { createdAt: 'DESC' } }); }
  updateExamResult(id: string, dto: UpdateExamResultDto) { return this.update(this.results, id, dto); }
  private async update<T extends { id: string }>(repo: Repository<T>, id: string, dto: Partial<T>) { const entity = await this.findOneOrFail(repo, id); Object.assign(entity, dto); return repo.save(entity); }
  private async findOneOrFail<T extends { id: string }>(repo: Repository<T>, id: string): Promise<T> { const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T> }); if (!entity) throw new NotFoundException('Resource not found'); return entity; }

  /**
   * Elektron jurnal jadvali: bitta sinf + fan + chorak uchun
   * o‘quvchilar (qatorlar) × darslar (ustunlar) matritsasini qaytaradi.
   */
  async getGradebook(query: GradebookQueryDto): Promise<GradebookResponseDto> {
    const quarter = await this.quarters.findOne({ where: { id: query.quarterId } });
    if (!quarter) {
      throw new NotFoundException('Quarter not found');
    }

    // Chorak sanalari oralig‘idagi, ushbu sinf+fan uchun darslar (ustunlar).
    const lessons = await this.lessons.find({
      where: {
        classId: query.classId,
        subjectId: query.subjectId,
        lessonDate: Between(quarter.startDate, quarter.endDate),
      },
      order: { lessonDate: 'ASC' },
    });

    // Sinfdagi faol o‘quvchilar (qatorlar).
    const students = await this.students.find({
      where: { currentClassId: query.classId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const lessonIds = lessons.map((lesson) => lesson.id);
    const entries = lessonIds.length
      ? await this.journal.find({ where: { lessonId: In(lessonIds) } })
      : [];

    // O‘quvchi bo‘yicha o‘rtacha bahoni hisoblash.
    const gradesByStudent = new Map<string, number[]>();
    for (const entry of entries) {
      if (entry.grade != null) {
        const bucket = gradesByStudent.get(entry.studentId) ?? [];
        bucket.push(entry.grade);
        gradesByStudent.set(entry.studentId, bucket);
      }
    }

    return {
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        lessonDate: lesson.lessonDate,
        topic: lesson.topic ?? null,
        status: lesson.status,
      })),
      students: students.map((student) => {
        const grades = gradesByStudent.get(student.id) ?? [];
        const average = grades.length
          ? Math.round((grades.reduce((sum, value) => sum + value, 0) / grades.length) * 100) / 100
          : null;
        return {
          id: student.id,
          fullName: `${student.lastName} ${student.firstName}`.trim(),
          studentCode: student.studentCode,
          average,
        };
      }),
      cells: entries.map((entry) => ({
        lessonId: entry.lessonId,
        studentId: entry.studentId,
        grade: entry.grade ?? null,
        homeworkDone: entry.homeworkDone,
        comment: entry.comment ?? null,
      })),
    };
  }

  /**
   * Bitta jurnal katagini (o‘quvchi × dars) saqlaydi: mavjud bo‘lsa yangilaydi,
   * bo‘lmasa yaratadi. grade=null yuborilsa bahoni o‘chiradi.
   */
  async upsertGrade(dto: UpsertGradeDto): Promise<JournalEntry> {
    const lesson = await this.lessons.findOne({ where: { id: dto.lessonId } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    let entry = await this.journal.findOne({
      where: { lessonId: dto.lessonId, studentId: dto.studentId },
    });

    if (!entry) {
      entry = this.journal.create({
        lessonId: dto.lessonId,
        studentId: dto.studentId,
        homeworkDone: false,
      });
    }

    if (dto.grade !== undefined) {
      entry.grade = dto.grade;
    }
    if (dto.homeworkDone !== undefined) {
      entry.homeworkDone = dto.homeworkDone;
    }
    if (dto.comment !== undefined) {
      entry.comment = dto.comment;
    }

    return this.journal.save(entry);
  }
}
