import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateDepartmentDto, CreateLeaveDto, CreatePayrollDto, CreatePositionDto, CreateStaffMemberDto, UpdateDepartmentDto, UpdateLeaveDto, UpdatePayrollDto, UpdatePositionDto, UpdateStaffMemberDto } from './dto/hr.dto';
import { HrService } from './hr.service';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr', version: '1' })
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('departments') @Permissions([AppPermission.HR_READ]) findDepartments() { return this.hrService.findDepartments(); }
  @Post('departments') @Permissions([AppPermission.HR_MANAGE]) createDepartment(@Body() dto: CreateDepartmentDto) { return this.hrService.createDepartment(dto); }
  @Patch('departments/:id') @Permissions([AppPermission.HR_MANAGE]) updateDepartment(@Param() p: UuidParamDto, @Body() dto: UpdateDepartmentDto) { return this.hrService.updateDepartment(p.id, dto); }

  @Get('positions') @Permissions([AppPermission.HR_READ]) findPositions() { return this.hrService.findPositions(); }
  @Post('positions') @Permissions([AppPermission.HR_MANAGE]) createPosition(@Body() dto: CreatePositionDto) { return this.hrService.createPosition(dto); }
  @Patch('positions/:id') @Permissions([AppPermission.HR_MANAGE]) updatePosition(@Param() p: UuidParamDto, @Body() dto: UpdatePositionDto) { return this.hrService.updatePosition(p.id, dto); }

  @Get('staff') @Permissions([AppPermission.HR_READ]) findStaffMembers() { return this.hrService.findStaffMembers(); }
  @Get('staff/:id') @Permissions([AppPermission.HR_READ]) getStaffMember(@Param() p: UuidParamDto) { return this.hrService.getStaffMember(p.id); }
  @Post('staff') @Permissions([AppPermission.HR_MANAGE]) createStaffMember(@Body() dto: CreateStaffMemberDto) { return this.hrService.createStaffMember(dto); }
  @Patch('staff/:id') @Permissions([AppPermission.HR_MANAGE]) updateStaffMember(@Param() p: UuidParamDto, @Body() dto: UpdateStaffMemberDto) { return this.hrService.updateStaffMember(p.id, dto); }

  @Get('leaves') @Permissions([AppPermission.HR_READ]) findLeaves() { return this.hrService.findLeaves(); }
  @Post('leaves') @Permissions([AppPermission.HR_MANAGE]) createLeave(@Body() dto: CreateLeaveDto) { return this.hrService.createLeave(dto); }
  @Patch('leaves/:id') @Permissions([AppPermission.HR_MANAGE]) updateLeave(@Param() p: UuidParamDto, @Body() dto: UpdateLeaveDto) { return this.hrService.updateLeave(p.id, dto); }

  @Get('payrolls') @Permissions([AppPermission.HR_READ]) findPayrolls() { return this.hrService.findPayrolls(); }
  @Post('payrolls') @Permissions([AppPermission.HR_MANAGE]) createPayroll(@Body() dto: CreatePayrollDto) { return this.hrService.createPayroll(dto); }
  @Patch('payrolls/:id') @Permissions([AppPermission.HR_MANAGE]) updatePayroll(@Param() p: UuidParamDto, @Body() dto: UpdatePayrollDto) { return this.hrService.updatePayroll(p.id, dto); }
}
