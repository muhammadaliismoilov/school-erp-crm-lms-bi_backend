import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalRequest } from './entities/approval-request.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({ imports: [TypeOrmModule.forFeature([ApprovalRequest])], controllers: [WorkflowController], providers: [WorkflowService], exports: [WorkflowService] })
export class WorkflowModule {}
