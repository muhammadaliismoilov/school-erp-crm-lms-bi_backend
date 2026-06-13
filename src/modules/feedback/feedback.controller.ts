import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateFeedbackCommentDto, CreateFeedbackTicketDto, UpdateFeedbackTicketDto } from './dto/feedback.dto';
import { FeedbackStatus } from './enums/feedback.enums';
import { FeedbackService } from './feedback.service';
@ApiTags('Feedback') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'feedback', version: '1' })
export class FeedbackController { constructor(private readonly service: FeedbackService) {}
  @Get('tickets') @Permissions([AppPermission.FEEDBACK_READ]) findTickets(@Query('status') status?: FeedbackStatus) { return this.service.findTickets(status); }
  @Post('tickets') @Permissions([AppPermission.FEEDBACK_MANAGE]) createTicket(@Body() dto: CreateFeedbackTicketDto) { return this.service.createTicket(dto); }
  @Patch('tickets/:id') @Permissions([AppPermission.FEEDBACK_MANAGE]) updateTicket(@Param() p: UuidParamDto, @Body() dto: UpdateFeedbackTicketDto) { return this.service.updateTicket(p.id, dto); }
  @Get('tickets/:id/comments') @Permissions([AppPermission.FEEDBACK_READ]) findComments(@Param('id') id: string) { return this.service.findComments(id); }
  @Post('comments') @Permissions([AppPermission.FEEDBACK_MANAGE]) createComment(@Body() dto: CreateFeedbackCommentDto) { return this.service.createComment(dto); }
}
