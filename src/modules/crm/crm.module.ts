import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadApplication } from './entities/lead-application.entity';
import { LeadSource } from './entities/lead-source.entity';
import { LeadTask } from './entities/lead-task.entity';
import { Lead } from './entities/lead.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadSource,
      LeadTask,
      PipelineStage,
      LeadApplication,
    ]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
