import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackComment } from './entities/feedback-comment.entity';
import { FeedbackTicket } from './entities/feedback-ticket.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
@Module({ imports: [TypeOrmModule.forFeature([FeedbackTicket, FeedbackComment])], controllers: [FeedbackController], providers: [FeedbackService], exports: [FeedbackService] })
export class FeedbackModule {}
