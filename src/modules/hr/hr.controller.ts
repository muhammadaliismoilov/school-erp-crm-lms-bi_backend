import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { BranchQueryDto, CreateBranchDto, CreateDepartmentDto, CreateLeaveDto, CreatePayrollDto, CreatePositionDto, CreateStaffAchievementDto, CreateStaffCertificateDto, CreateStaffMemberDto, DepartmentQueryDto, LeaveQueryDto, PositionQueryDto, ReviewLeaveDto, StaffQueryDto, UpdateBranchDto, UpdateDepartmentDto, UpdateLeaveDto, UpdatePayrollDto, UpdatePositionDto, UpdateStaffAchievementDto, UpdateStaffCertificateDto, UpdateStaffMemberDto } from './dto/hr.dto';
import { CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './dto/task.dto';
import { AttendanceQueryDto, CreateAttendanceDto, ReviewAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { AttendanceHrService } from './attendance-hr.service';
import { BranchService } from './branch.service';
import { DepartmentService } from './department.service';
import { LeaveService } from './leave.service';
import { PositionService } from './position.service';
import { TaskService } from './task.service';
import { HrService } from './hr.service';
import { StaffActor, StaffService } from './staff.service';
import { StaffPortfolioService } from './staff-portfolio.service';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr', version: '1' })
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly staffService: StaffService,
    private readonly departmentService: DepartmentService,
    private readonly branchService: BranchService,
    private readonly positionService: PositionService,
    private readonly leaveService: LeaveService,
    private readonly taskService: TaskService,
    private readonly attendanceService: AttendanceHrService,
    private readonly portfolioService: StaffPortfolioService,
  ) {}

  private actor(user: AuthenticatedUser): StaffActor {
    return { userId: user?.id, username: user?.username };
  }

  @Get('schools/options') @Permissions([AppPermission.HR_BRANCHES_READ]) findSchoolOptions() { return this.branchService.schoolOptions(); }
  @Get('branches/options') @Permissions([AppPermission.HR_BRANCHES_READ]) findBranchOptions() { return this.branchService.options(); }
  @Get('branches') @Permissions([AppPermission.HR_BRANCHES_READ]) findBranches(@Query() query: BranchQueryDto) { return this.branchService.findBranches(query); }
  @Get('branches/:id') @Permissions([AppPermission.HR_BRANCHES_READ]) getBranch(@Param() p: UuidParamDto) { return this.branchService.getBranch(p.id); }
  @Post('branches') @Permissions([AppPermission.HR_BRANCHES_CREATE]) createBranch(@Body() dto: CreateBranchDto) { return this.branchService.createBranch(dto); }
  @Patch('branches/:id') @Permissions([AppPermission.HR_BRANCHES_UPDATE]) updateBranch(@Param() p: UuidParamDto, @Body() dto: UpdateBranchDto) { return this.branchService.updateBranch(p.id, dto); }
  @Delete('branches/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_BRANCHES_DELETE]) removeBranch(@Param() p: UuidParamDto) { return this.branchService.removeBranch(p.id); }
  @Get('departments') @Permissions([AppPermission.HR_DEPARTMENTS_READ]) findDepartments(@Query() query: DepartmentQueryDto) { return this.departmentService.findDepartments(query); }
  @Get('departments/:id') @Permissions([AppPermission.HR_DEPARTMENTS_READ]) getDepartment(@Param() p: UuidParamDto) { return this.departmentService.getDepartment(p.id); }
  @Post('departments') @Permissions([AppPermission.HR_DEPARTMENTS_CREATE]) createDepartment(@Body() dto: CreateDepartmentDto) { return this.departmentService.createDepartment(dto); }
  @Patch('departments/:id') @Permissions([AppPermission.HR_DEPARTMENTS_UPDATE]) updateDepartment(@Param() p: UuidParamDto, @Body() dto: UpdateDepartmentDto) { return this.departmentService.updateDepartment(p.id, dto); }
  @Delete('departments/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_DEPARTMENTS_DELETE]) removeDepartment(@Param() p: UuidParamDto) { return this.departmentService.removeDepartment(p.id); }

  @Get('positions') @Permissions([AppPermission.HR_POSITIONS_READ]) findPositions(@Query() query: PositionQueryDto) { return this.positionService.findPositions(query); }
  @Get('positions/:id') @Permissions([AppPermission.HR_POSITIONS_READ]) getPosition(@Param() p: UuidParamDto) { return this.positionService.getPosition(p.id); }
  @Post('positions') @Permissions([AppPermission.HR_POSITIONS_CREATE]) createPosition(@Body() dto: CreatePositionDto) { return this.positionService.createPosition(dto); }
  @Patch('positions/:id') @Permissions([AppPermission.HR_POSITIONS_UPDATE]) updatePosition(@Param() p: UuidParamDto, @Body() dto: UpdatePositionDto) { return this.positionService.updatePosition(p.id, dto); }
  @Delete('positions/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_POSITIONS_DELETE]) removePosition(@Param() p: UuidParamDto) { return this.positionService.removePosition(p.id); }

  @Get('staff') @Permissions([AppPermission.HR_STAFF_READ]) findStaffMembers(@Query() query: StaffQueryDto) { return this.staffService.findStaff(query); }
  @Get('staff/:id') @Permissions([AppPermission.HR_STAFF_READ]) getStaffMember(@Param() p: UuidParamDto) { return this.staffService.getStaff(p.id); }
  @Get('staff/:id/salary-history') @Permissions([AppPermission.HR_STAFF_READ]) getStaffSalaryHistory(@Param() p: UuidParamDto) { return this.staffService.getSalaryHistory(p.id); }
  @Post('staff') @Permissions([AppPermission.HR_STAFF_CREATE]) createStaffMember(@Body() dto: CreateStaffMemberDto, @CurrentUser() user: AuthenticatedUser) { return this.staffService.createStaff(dto, this.actor(user)); }
  @Patch('staff/:id') @Permissions([AppPermission.HR_STAFF_UPDATE]) updateStaffMember(@Param() p: UuidParamDto, @Body() dto: UpdateStaffMemberDto, @CurrentUser() user: AuthenticatedUser) { return this.staffService.updateStaff(p.id, dto, this.actor(user)); }
  @Delete('staff/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_STAFF_DELETE]) removeStaffMember(@Param() p: UuidParamDto) { return this.staffService.removeStaff(p.id); }

  @Get('staff/:id/certificates') @Permissions([AppPermission.HR_STAFF_CERTIFICATES_READ]) listStaffCertificates(@Param() p: UuidParamDto) { return this.portfolioService.listCertificates(p.id); }
  @Post('staff/:id/certificates') @Permissions([AppPermission.HR_STAFF_CERTIFICATES_CREATE]) createStaffCertificate(@Param() p: UuidParamDto, @Body() dto: CreateStaffCertificateDto) { return this.portfolioService.createCertificate(p.id, dto); }
  @Patch('staff/:id/certificates/:certId') @Permissions([AppPermission.HR_STAFF_CERTIFICATES_UPDATE]) updateStaffCertificate(@Param('id', ParseUUIDPipe) id: string, @Param('certId', ParseUUIDPipe) certId: string, @Body() dto: UpdateStaffCertificateDto) { return this.portfolioService.updateCertificate(id, certId, dto); }
  @Delete('staff/:id/certificates/:certId') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_STAFF_CERTIFICATES_DELETE]) removeStaffCertificate(@Param('id', ParseUUIDPipe) id: string, @Param('certId', ParseUUIDPipe) certId: string) { return this.portfolioService.removeCertificate(id, certId); }

  @Get('staff/:id/achievements') @Permissions([AppPermission.HR_STAFF_ACHIEVEMENTS_READ]) listStaffAchievements(@Param() p: UuidParamDto) { return this.portfolioService.listAchievements(p.id); }
  @Post('staff/:id/achievements') @Permissions([AppPermission.HR_STAFF_ACHIEVEMENTS_CREATE]) createStaffAchievement(@Param() p: UuidParamDto, @Body() dto: CreateStaffAchievementDto) { return this.portfolioService.createAchievement(p.id, dto); }
  @Patch('staff/:id/achievements/:achId') @Permissions([AppPermission.HR_STAFF_ACHIEVEMENTS_UPDATE]) updateStaffAchievement(@Param('id', ParseUUIDPipe) id: string, @Param('achId', ParseUUIDPipe) achId: string, @Body() dto: UpdateStaffAchievementDto) { return this.portfolioService.updateAchievement(id, achId, dto); }
  @Delete('staff/:id/achievements/:achId') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_STAFF_ACHIEVEMENTS_DELETE]) removeStaffAchievement(@Param('id', ParseUUIDPipe) id: string, @Param('achId', ParseUUIDPipe) achId: string) { return this.portfolioService.removeAchievement(id, achId); }

  @Get('leaves') @Permissions([AppPermission.HR_LEAVES_READ]) findLeaves(@Query() query: LeaveQueryDto) { return this.leaveService.findLeaves(query); }
  @Get('leaves/:id') @Permissions([AppPermission.HR_LEAVES_READ]) getLeave(@Param() p: UuidParamDto) { return this.leaveService.getLeave(p.id); }
  @Post('leaves') @Permissions([AppPermission.HR_LEAVES_CREATE]) createLeave(@Body() dto: CreateLeaveDto) { return this.leaveService.createLeave(dto); }
  @Patch('leaves/:id/review') @Permissions([AppPermission.HR_LEAVES_UPDATE]) reviewLeave(@Param() p: UuidParamDto, @Body() dto: ReviewLeaveDto) { return this.leaveService.reviewLeave(p.id, dto); }
  @Patch('leaves/:id') @Permissions([AppPermission.HR_LEAVES_UPDATE]) updateLeave(@Param() p: UuidParamDto, @Body() dto: UpdateLeaveDto) { return this.leaveService.updateLeave(p.id, dto); }
  @Delete('leaves/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_LEAVES_DELETE]) removeLeave(@Param() p: UuidParamDto) { return this.leaveService.removeLeave(p.id); }

  // Loyihalar (projects) endi alohida ProjectController orqali boshqariladi.

  @Get('tasks') @Permissions([AppPermission.HR_TASKS_READ]) findTasks(@Query() query: TaskQueryDto) { return this.taskService.findTasks(query); }
  @Get('tasks/:id') @Permissions([AppPermission.HR_TASKS_READ]) getTask(@Param() p: UuidParamDto) { return this.taskService.getTask(p.id); }
  @Post('tasks') @Permissions([AppPermission.HR_TASKS_CREATE]) createTask(@Body() dto: CreateTaskDto) { return this.taskService.createTask(dto); }
  @Patch('tasks/:id') @Permissions([AppPermission.HR_TASKS_UPDATE]) updateTask(@Param() p: UuidParamDto, @Body() dto: UpdateTaskDto) { return this.taskService.updateTask(p.id, dto); }
  @Delete('tasks/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_TASKS_DELETE]) removeTask(@Param() p: UuidParamDto) { return this.taskService.removeTask(p.id); }

  // Geofencelar (geozonalar) endi alohida GeofenceController orqali boshqariladi.

  @Get('attendance') @Permissions([AppPermission.HR_ATTENDANCE_READ]) findAttendance(@Query() query: AttendanceQueryDto) { return this.attendanceService.findRecords(query); }
  @Get('attendance/:id') @Permissions([AppPermission.HR_ATTENDANCE_READ]) getAttendance(@Param() p: UuidParamDto) { return this.attendanceService.getRecord(p.id); }
  @Post('attendance') @Permissions([AppPermission.HR_ATTENDANCE_CREATE]) createAttendance(@Body() dto: CreateAttendanceDto) { return this.attendanceService.createRecord(dto); }
  @Patch('attendance/:id/review') @Permissions([AppPermission.HR_ATTENDANCE_UPDATE]) reviewAttendance(@Param() p: UuidParamDto, @Body() dto: ReviewAttendanceDto) { return this.attendanceService.reviewRecord(p.id, dto); }
  @Patch('attendance/:id') @Permissions([AppPermission.HR_ATTENDANCE_UPDATE]) updateAttendance(@Param() p: UuidParamDto, @Body() dto: UpdateAttendanceDto) { return this.attendanceService.updateRecord(p.id, dto); }
  @Delete('attendance/:id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_ATTENDANCE_DELETE]) removeAttendance(@Param() p: UuidParamDto) { return this.attendanceService.removeRecord(p.id); }

  @Get('payrolls') @Permissions([AppPermission.HR_PAYROLLS_READ]) findPayrolls() { return this.hrService.findPayrolls(); }
  @Post('payrolls') @Permissions([AppPermission.HR_PAYROLLS_CREATE]) createPayroll(@Body() dto: CreatePayrollDto) { return this.hrService.createPayroll(dto); }
  @Patch('payrolls/:id') @Permissions([AppPermission.HR_PAYROLLS_UPDATE]) updatePayroll(@Param() p: UuidParamDto, @Body() dto: UpdatePayrollDto) { return this.hrService.updatePayroll(p.id, dto); }
}
