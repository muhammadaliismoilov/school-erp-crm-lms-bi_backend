import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdmissionPipeline } from './entities/admission-pipeline.entity';
import { AdmissionStage } from './entities/admission-stage.entity';
import { AdmissionApplication } from './entities/admission-application.entity';
import { EntranceExam } from './entities/entrance-exam.entity';
import { AdmissionDecision } from './entities/admission-decision.entity';
import { CreateAdmissionPipelineDto, UpdateAdmissionPipelineDto, CreateAdmissionStageDto, UpdateAdmissionStageDto, CreateAdmissionApplicationDto, UpdateAdmissionApplicationDto, CreateEntranceExamDto, UpdateEntranceExamDto, CreateAdmissionDecisionDto, UpdateAdmissionDecisionDto } from './dto/admissions.dto';

@Injectable()
export class AdmissionsService {
  constructor(@InjectRepository(AdmissionPipeline) private readonly pipelines: Repository<AdmissionPipeline>, @InjectRepository(AdmissionStage) private readonly stages: Repository<AdmissionStage>, @InjectRepository(AdmissionApplication) private readonly applications: Repository<AdmissionApplication>, @InjectRepository(EntranceExam) private readonly exams: Repository<EntranceExam>, @InjectRepository(AdmissionDecision) private readonly decisions: Repository<AdmissionDecision>) {}

  findPipelines() { return this.pipelines.find({ order: { createdAt: 'DESC' } }); }
  createPipelines(dto: CreateAdmissionPipelineDto) { return this.pipelines.save(this.pipelines.create(dto)); }
  async updatePipelines(id: string, dto: UpdateAdmissionPipelineDto) { const entity = await this.pipelines.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AdmissionPipeline not found'); return this.pipelines.save(entity); }

  findStages() { return this.stages.find({ order: { createdAt: 'DESC' } }); }
  createStages(dto: CreateAdmissionStageDto) { return this.stages.save(this.stages.create(dto)); }
  async updateStages(id: string, dto: UpdateAdmissionStageDto) { const entity = await this.stages.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AdmissionStage not found'); return this.stages.save(entity); }

  findApplications() { return this.applications.find({ order: { createdAt: 'DESC' } }); }
  createApplications(dto: CreateAdmissionApplicationDto) { return this.applications.save(this.applications.create(dto)); }
  async updateApplications(id: string, dto: UpdateAdmissionApplicationDto) { const entity = await this.applications.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AdmissionApplication not found'); return this.applications.save(entity); }

  findExams() { return this.exams.find({ order: { createdAt: 'DESC' } }); }
  createExams(dto: CreateEntranceExamDto) { return this.exams.save(this.exams.create(dto)); }
  async updateExams(id: string, dto: UpdateEntranceExamDto) { const entity = await this.exams.preload({ id, ...dto }); if (!entity) throw new NotFoundException('EntranceExam not found'); return this.exams.save(entity); }

  findDecisions() { return this.decisions.find({ order: { createdAt: 'DESC' } }); }
  createDecisions(dto: CreateAdmissionDecisionDto) { return this.decisions.save(this.decisions.create(dto)); }
  async updateDecisions(id: string, dto: UpdateAdmissionDecisionDto) { const entity = await this.decisions.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AdmissionDecision not found'); return this.decisions.save(entity); }
}
