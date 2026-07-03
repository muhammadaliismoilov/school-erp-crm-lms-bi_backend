import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateApprovalRequestDto, DecideApprovalRequestDto } from './dto/workflow.dto';
import { ApprovalStatus } from './enums/workflow.enums';
import { WorkflowService } from './workflow.service';

@ApiTags('Workflow') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'workflow', version: '1' })
export class WorkflowController { constructor(private readonly service: WorkflowService) {}
  @Get('approvals') @Permissions([AppPermission.WORKFLOW_APPROVALS_READ]) findApprovals(@Query('status') status?: ApprovalStatus) { return this.service.findApprovals(status); }
  @Post('approvals') @Permissions([AppPermission.WORKFLOW_APPROVALS_CREATE]) createApproval(@Body() dto: CreateApprovalRequestDto) { return this.service.createApproval(dto); }
  @Patch('approvals/:id/decision') @Permissions([AppPermission.WORKFLOW_APPROVALS_UPDATE]) decide(@Param() p: UuidParamDto, @Body() dto: DecideApprovalRequestDto) { return this.service.decide(p.id, dto); }
}
