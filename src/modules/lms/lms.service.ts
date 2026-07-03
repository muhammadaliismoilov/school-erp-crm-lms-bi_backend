import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateExamResultDto, CreateJournalEntryDto, CreateLessonScheduleDto, UpdateExamResultDto, UpdateJournalEntryDto, UpdateLessonScheduleDto } from './dto/lms.dto';
import { ExamResult } from './entities/exam-result.entity';
import { Exam } from './entities/exam.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';

@Injectable()
export class LmsService {
  constructor(@InjectRepository(LessonSchedule) private readonly lessons: Repository<LessonSchedule>, @InjectRepository(JournalEntry) private readonly journal: Repository<JournalEntry>, @InjectRepository(Exam) private readonly exams: Repository<Exam>, @InjectRepository(ExamResult) private readonly results: Repository<ExamResult>, private readonly tenant: TenantContextService) {}
  createLesson(dto: CreateLessonScheduleDto) { return this.lessons.save(this.lessons.create(dto)); }
  findLessons() { return this.lessons.find({ where: tenantWhere<LessonSchedule>(this.tenant, {}, { branch: true }), relations: { class: true, subject: true, teacher: true, room: true, lessonPeriod: true }, order: { lessonDate: 'DESC' } }); }
  updateLesson(id: string, dto: UpdateLessonScheduleDto) { return this.update(this.lessons, id, dto); }
  createJournalEntry(dto: CreateJournalEntryDto) { return this.journal.save(this.journal.create({ ...dto, homeworkDone: dto.homeworkDone ?? false })); }
  findJournalEntries() { return this.journal.find({ where: tenantWhere<JournalEntry>(this.tenant, {}, { branch: true }), relations: { lesson: true, student: true }, order: { createdAt: 'DESC' } }); }
  updateJournalEntry(id: string, dto: UpdateJournalEntryDto) { return this.update(this.journal, id, dto); }
  createExamResult(dto: CreateExamResultDto) { return this.results.save(this.results.create(dto)); }
  findExamResults() { return this.results.find({ where: tenantWhere<ExamResult>(this.tenant, {}, { branch: true }), relations: { exam: true, student: true }, order: { createdAt: 'DESC' } }); }
  updateExamResult(id: string, dto: UpdateExamResultDto) { return this.update(this.results, id, dto); }
  private async update<T extends { id: string }>(repo: Repository<T>, id: string, dto: Partial<T>) { const entity = await this.findOneOrFail(repo, id); Object.assign(entity, dto); return repo.save(entity); }
  private async findOneOrFail<T extends { id: string }>(repo: Repository<T>, id: string): Promise<T> { const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T> }); if (!entity) throw new NotFoundException('Resource not found'); return entity; }
}
