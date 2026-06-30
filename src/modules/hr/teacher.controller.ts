import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateTeacherDto, TeacherQueryDto, UpdateTeacherDto } from './dto/teacher.dto';
import { TeacherService } from './teacher.service';

@ApiTags('HR Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/teachers', version: '1' })
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('stats') @Permissions([AppPermission.HR_READ]) stats() { return this.teacherService.stats(); }
  @Get() @Permissions([AppPermission.HR_READ]) find(@Query() query: TeacherQueryDto) { return this.teacherService.findTeachers(query); }
  @Get(':id') @Permissions([AppPermission.HR_READ]) get(@Param() p: UuidParamDto) { return this.teacherService.getTeacher(p.id); }
  @Post() @Permissions([AppPermission.HR_MANAGE]) create(@Body() dto: CreateTeacherDto) { return this.teacherService.createTeacher(dto); }
  @Patch(':id') @Permissions([AppPermission.HR_MANAGE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateTeacherDto) { return this.teacherService.updateTeacher(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_MANAGE]) remove(@Param() p: UuidParamDto) { return this.teacherService.removeTeacher(p.id); }
}
