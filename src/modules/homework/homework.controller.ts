import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CheckHomeworkDto, CreateHomeworkAssignmentDto, SubmitHomeworkDto, UpdateHomeworkAssignmentDto } from './dto/homework.dto';
import { HomeworkService } from './homework.service';

@ApiTags('Homework') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'homework', version: '1' })
export class HomeworkController {
  constructor(private readonly service: HomeworkService) {}
  @Get('assignments') @Permissions([AppPermission.HOMEWORK_ASSIGNMENTS_READ]) findAssignments() { return this.service.findAssignments(); }
  @Post('assignments') @Permissions([AppPermission.HOMEWORK_ASSIGNMENTS_CREATE]) createAssignment(@Body() dto: CreateHomeworkAssignmentDto) { return this.service.createAssignment(dto); }
  @Patch('assignments/:id') @Permissions([AppPermission.HOMEWORK_ASSIGNMENTS_UPDATE]) updateAssignment(@Param() p: UuidParamDto, @Body() dto: UpdateHomeworkAssignmentDto) { return this.service.updateAssignment(p.id, dto); }
  @Get('submissions') @Permissions([AppPermission.HOMEWORK_SUBMISSIONS_READ]) findSubmissions(@Query('assignmentId') assignmentId?: string) { return this.service.findSubmissions(assignmentId); }
  @Post('submissions') @Permissions([AppPermission.HOMEWORK_SUBMISSIONS_CREATE]) submit(@Body() dto: SubmitHomeworkDto) { return this.service.submit(dto); }
  @Patch('submissions/:id/check') @Permissions([AppPermission.HOMEWORK_SUBMISSIONS_UPDATE]) check(@Param() p: UuidParamDto, @Body() dto: CheckHomeworkDto) { return this.service.check(p.id, dto); }
}
