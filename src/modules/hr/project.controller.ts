import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateProjectFullDto, ProjectQueryDto, UpdateProjectFullDto } from './dto/project.dto';
import { ProjectService } from './project.service';

@ApiTags('HR Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/projects', version: '1' })
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('options') @Permissions([AppPermission.HR_PROJECTS_READ]) options() { return this.projectService.options(); }
  @Get() @Permissions([AppPermission.HR_PROJECTS_READ]) find(@Query() query: ProjectQueryDto) { return this.projectService.findProjects(query); }
  @Get(':id') @Permissions([AppPermission.HR_PROJECTS_READ]) get(@Param() p: UuidParamDto) { return this.projectService.getProject(p.id); }
  @Post() @Permissions([AppPermission.HR_PROJECTS_CREATE]) create(@Body() dto: CreateProjectFullDto) { return this.projectService.createProject(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_PROJECTS_UPDATE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateProjectFullDto) { return this.projectService.updateProject(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_PROJECTS_DELETE]) remove(@Param() p: UuidParamDto) { return this.projectService.removeProject(p.id); }
}
