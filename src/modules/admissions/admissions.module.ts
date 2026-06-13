import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionPipeline } from './entities/admission-pipeline.entity';
import { AdmissionStage } from './entities/admission-stage.entity';
import { AdmissionApplication } from './entities/admission-application.entity';
import { EntranceExam } from './entities/entrance-exam.entity';
import { AdmissionDecision } from './entities/admission-decision.entity';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';

@Module({ imports: [TypeOrmModule.forFeature([AdmissionPipeline, AdmissionStage, AdmissionApplication, EntranceExam, AdmissionDecision])], controllers: [AdmissionsController], providers: [AdmissionsService], exports: [AdmissionsService] })
export class AdmissionsModule {}
