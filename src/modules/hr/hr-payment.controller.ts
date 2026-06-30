import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CreateHrPaymentDto,
  HrPaymentQueryDto,
  UpdateHrPaymentDto,
  UpdateHrPaymentStatusDto,
} from './dto/hr-payment.dto';
import { HrPaymentService } from './hr-payment.service';

@ApiTags('HR Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/payments', version: '1' })
export class HrPaymentController {
  constructor(private readonly paymentService: HrPaymentService) {}

  @Get() @Permissions([AppPermission.HR_READ]) find(@Query() query: HrPaymentQueryDto) { return this.paymentService.findPayments(query); }
  @Get(':id') @Permissions([AppPermission.HR_READ]) get(@Param() p: UuidParamDto) { return this.paymentService.getPayment(p.id); }
  @Post() @Permissions([AppPermission.HR_MANAGE]) create(@Body() dto: CreateHrPaymentDto) { return this.paymentService.createPayment(dto); }
  @Patch(':id/status') @Permissions([AppPermission.HR_MANAGE]) updateStatus(@Param() p: UuidParamDto, @Body() dto: UpdateHrPaymentStatusDto) { return this.paymentService.updateStatus(p.id, dto); }
  @Patch(':id') @Permissions([AppPermission.HR_MANAGE]) update(@Param() p: UuidParamDto, @Body() dto: UpdateHrPaymentDto) { return this.paymentService.updatePayment(p.id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @Permissions([AppPermission.HR_MANAGE]) remove(@Param() p: UuidParamDto) { return this.paymentService.removePayment(p.id); }
}
