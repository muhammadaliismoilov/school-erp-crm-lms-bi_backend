import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackCommentDto, CreateFeedbackTicketDto, UpdateFeedbackTicketDto } from './dto/feedback.dto';
import { FeedbackComment } from './entities/feedback-comment.entity';
import { FeedbackTicket } from './entities/feedback-ticket.entity';
import { FeedbackStatus } from './enums/feedback.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
@Injectable()
export class FeedbackService {
  constructor(@InjectRepository(FeedbackTicket) private tickets: Repository<FeedbackTicket>, @InjectRepository(FeedbackComment) private comments: Repository<FeedbackComment>, private readonly tenant: TenantContextService) {}
  findTickets(status?: FeedbackStatus) { return this.tickets.find({ where: tenantWhere<FeedbackTicket>(this.tenant, status ? { status } : {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createTicket(dto: CreateFeedbackTicketDto) { return this.tickets.save(this.tickets.create(dto)); }
  async updateTicket(id: string, dto: UpdateFeedbackTicketDto) { const existing = await this.tickets.findOne({ where: tenantWhere<FeedbackTicket>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('Feedback ticket not found'); const resolvedAt = dto.status === FeedbackStatus.RESOLVED || dto.status === FeedbackStatus.CLOSED ? new Date() : undefined; const e = await this.tickets.preload({ id, ...dto, resolvedAt }); if (!e) throw new NotFoundException('Feedback ticket not found'); return this.tickets.save(e); }
  findComments(ticketId: string) { return this.comments.find({ where: tenantWhere<FeedbackComment>(this.tenant, { ticketId }, { branch: true }), order: { createdAt: 'ASC' } }); }
  createComment(dto: CreateFeedbackCommentDto) { return this.comments.save(this.comments.create(dto)); }
}
