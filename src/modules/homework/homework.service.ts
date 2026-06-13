import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckHomeworkDto, CreateHomeworkAssignmentDto, SubmitHomeworkDto, UpdateHomeworkAssignmentDto } from './dto/homework.dto';
import { HomeworkAssignment } from './entities/homework-assignment.entity';
import { HomeworkSubmission } from './entities/homework-submission.entity';
import { SubmissionStatus } from './enums/homework.enums';

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(HomeworkAssignment) private readonly assignments: Repository<HomeworkAssignment>,
    @InjectRepository(HomeworkSubmission) private readonly submissions: Repository<HomeworkSubmission>,
  ) {}
  findAssignments() { return this.assignments.find({ order: { dueDate: 'DESC' } }); }
  async createAssignment(dto: CreateHomeworkAssignmentDto) { return this.assignments.save(this.assignments.create({ ...dto, dueDate: new Date(dto.dueDate) })); }
  async updateAssignment(id: string, dto: UpdateHomeworkAssignmentDto) {
    const entity = await this.assignments.preload({ id, ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined });
    if (!entity) throw new NotFoundException('Homework assignment not found');
    return this.assignments.save(entity);
  }
  findSubmissions(assignmentId?: string) { return this.submissions.find({ where: assignmentId ? { assignmentId } : {}, order: { createdAt: 'DESC' } }); }
  async submit(dto: SubmitHomeworkDto) {
    const entity = await this.submissions.findOne({ where: { assignmentId: dto.assignmentId, studentId: dto.studentId } });
    const payload = { ...dto, submittedAt: new Date(), status: SubmissionStatus.SUBMITTED };
    return this.submissions.save(entity ? { ...entity, ...payload } : this.submissions.create(payload));
  }
  async check(id: string, dto: CheckHomeworkDto) {
    const entity = await this.submissions.preload({ id, ...dto, status: dto.status ?? SubmissionStatus.CHECKED });
    if (!entity) throw new NotFoundException('Homework submission not found');
    return this.submissions.save(entity);
  }
}
