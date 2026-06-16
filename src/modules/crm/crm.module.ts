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
import { Referral } from './entities/referral.entity';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { ReferralsController } from './referrals.controller';
import { PublicReferralsController } from './public-referrals.controller';
import { ReferralsService } from './referrals.service';

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
      Referral,
    ]),
    AuditModule,
    StudentsModule,
  ],
  controllers: [CrmController, ReferralsController, PublicReferralsController],
  providers: [CrmService, ReferralsService],
})
export class CrmModule {}
