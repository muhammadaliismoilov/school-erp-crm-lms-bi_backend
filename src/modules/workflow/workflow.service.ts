import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateApprovalRequestDto, DecideApprovalRequestDto } from './dto/workflow.dto';
import { ApprovalRequest } from './entities/approval-request.entity';
import { ApprovalStatus } from './enums/workflow.enums';

@Injectable()
export class WorkflowService {
  constructor(@InjectRepository(ApprovalRequest) private readonly approvals: Repository<ApprovalRequest>) {}
  findApprovals(status?: ApprovalStatus) { return this.approvals.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } }); }
  createApproval(dto: CreateApprovalRequestDto) { return this.approvals.save(this.approvals.create(dto)); }
  async decide(id: string, dto: DecideApprovalRequestDto) {
    if (![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.CANCELLED].includes(dto.status)) throw new BadRequestException('Decision status must be approved, rejected or cancelled');
    const entity = await this.approvals.preload({ id, ...dto, decidedAt: new Date() });
    if (!entity) throw new NotFoundException('Approval request not found');
    return this.approvals.save(entity);
  }
}
