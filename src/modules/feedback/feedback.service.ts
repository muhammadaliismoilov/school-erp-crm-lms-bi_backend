import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackCommentDto, CreateFeedbackTicketDto, UpdateFeedbackTicketDto } from './dto/feedback.dto';
import { FeedbackComment } from './entities/feedback-comment.entity';
import { FeedbackTicket } from './entities/feedback-ticket.entity';
import { FeedbackStatus } from './enums/feedback.enums';
@Injectable()
export class FeedbackService {
  constructor(@InjectRepository(FeedbackTicket) private tickets: Repository<FeedbackTicket>, @InjectRepository(FeedbackComment) private comments: Repository<FeedbackComment>) {}
  findTickets(status?: FeedbackStatus) { return this.tickets.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } }); }
  createTicket(dto: CreateFeedbackTicketDto) { return this.tickets.save(this.tickets.create(dto)); }
  async updateTicket(id: string, dto: UpdateFeedbackTicketDto) { const resolvedAt = dto.status === FeedbackStatus.RESOLVED || dto.status === FeedbackStatus.CLOSED ? new Date() : undefined; const e = await this.tickets.preload({ id, ...dto, resolvedAt }); if (!e) throw new NotFoundException('Feedback ticket not found'); return this.tickets.save(e); }
  findComments(ticketId: string) { return this.comments.find({ where: { ticketId }, order: { createdAt: 'ASC' } }); }
  createComment(dto: CreateFeedbackCommentDto) { return this.comments.save(this.comments.create(dto)); }
}
