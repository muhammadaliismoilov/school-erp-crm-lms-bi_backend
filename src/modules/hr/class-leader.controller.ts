import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ClassLeaderService } from './class-leader.service';
import {
  ClassLeaderQueryDto,
  CreateClassLeaderAssignmentDto,
  UpdateClassLeaderAssignmentDto,
} from './dto/class-leader.dto';

/** Sinf rahbarligi biriktiruvlari (payroll'da proporsional to'lov asosi). */
@ApiTags('HR Class Leaderships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/class-leaderships', version: '1' })
export class ClassLeaderController {
  constructor(private readonly service: ClassLeaderService) {}

  @Get()
  @Permissions([AppPermission.HR_CLASS_LEADERSHIPS_READ])
  find(@Query() query: ClassLeaderQueryDto) {
    return this.service.find(query);
  }

  @Post()
  @Permissions([AppPermission.HR_CLASS_LEADERSHIPS_CREATE])
  assign(@Body() dto: CreateClassLeaderAssignmentDto) {
    return this.service.assign(dto);
  }

  @Patch(':id')
  @Permissions([AppPermission.HR_CLASS_LEADERSHIPS_UPDATE])
  update(@Param() p: UuidParamDto, @Body() dto: UpdateClassLeaderAssignmentDto) {
    return this.service.update(p.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.HR_CLASS_LEADERSHIPS_DELETE])
  remove(@Param() p: UuidParamDto) {
    return this.service.remove(p.id);
  }
}
