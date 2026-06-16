import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { StudentsModule } from '../students/students.module';
import { LeadApplication } from './entities/lead-application.entity';
import { LeadComment } from './entities/lead-comment.entity';
import { LeadSource } from './entities/lead-source.entity';
import { LeadTag } from './entities/lead-tag.entity';
import { LeadTask } from './entities/lead-task.entity';
import { Lead } from './entities/lead.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadComment,
      LeadSource,
      LeadTag,
      LeadTask,
      PipelineStage,
      LeadApplication,
    ]),
    AuditModule,
    StudentsModule,
  ],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
