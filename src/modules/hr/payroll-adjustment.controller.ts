import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import {
  CreatePayrollAdjustmentDto,
  PayrollAdjustmentQueryDto,
  UpdatePayrollAdjustmentDto,
} from './dto/payroll-adjustment.dto';
import { PayrollAdjustmentService } from './payroll-adjustment.service';

/** Qo'lda bonus/jarima yozuvlari (sabab majburiy, kim kiritgani saqlanadi). */
@ApiTags('HR Payroll Adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/payroll-adjustments', version: '1' })
export class PayrollAdjustmentController {
  constructor(private readonly service: PayrollAdjustmentService) {}

  @Get()
  @Permissions([AppPermission.HR_PAYROLL_ADJUSTMENTS_READ])
  find(@Query() query: PayrollAdjustmentQueryDto) {
    return this.service.find(query);
  }

  @Post()
  @Permissions([AppPermission.HR_PAYROLL_ADJUSTMENTS_CREATE])
  create(@Body() dto: CreatePayrollAdjustmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user?.id);
  }

  @Patch(':id')
  @Permissions([AppPermission.HR_PAYROLL_ADJUSTMENTS_UPDATE])
  update(@Param() p: UuidParamDto, @Body() dto: UpdatePayrollAdjustmentDto) {
    return this.service.update(p.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.HR_PAYROLL_ADJUSTMENTS_DELETE])
  remove(@Param() p: UuidParamDto) {
    return this.service.remove(p.id);
  }
}
