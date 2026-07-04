import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CreatePayRateCardDto,
  PayRateCardQueryDto,
  UpdatePayRateCardDto,
  UpdatePayrollSettingsDto,
} from './dto/payroll-config.dto';
import { PayrollConfigService } from './payroll-config.service';

/** Payroll konfiguratsiyasi: toifa stavkalari jadvali va oylik siyosati. */
@ApiTags('HR Payroll Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/payroll-config', version: '1' })
export class PayrollConfigController {
  constructor(private readonly config: PayrollConfigService) {}

  // ─── Stavka jadvali ───────────────────────────────────────────────────────

  @Get('rate-cards')
  @Permissions([AppPermission.HR_PAYROLL_CONFIG_READ])
  findRateCards(@Query() query: PayRateCardQueryDto) {
    return this.config.findRateCards(query);
  }

  @Post('rate-cards')
  @Permissions([AppPermission.HR_PAYROLL_CONFIG_CREATE])
  createRateCard(@Body() dto: CreatePayRateCardDto) {
    return this.config.createRateCard(dto);
  }

  @Patch('rate-cards/:id')
  @Permissions([AppPermission.HR_PAYROLL_CONFIG_UPDATE])
  updateRateCard(@Param() p: UuidParamDto, @Body() dto: UpdatePayRateCardDto) {
    return this.config.updateRateCard(p.id, dto);
  }

  @Delete('rate-cards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.HR_PAYROLL_CONFIG_DELETE])
  removeRateCard(@Param() p: UuidParamDto) {
    return this.config.removeRateCard(p.id);
  }

  // ─── Oylik siyosati sozlamalari ───────────────────────────────────────────

  @Get('settings')
  @Permissions([AppPermission.HR_PAYROLL_CONFIG_READ])
  getSettings() {
    return this.config.currentSettings();
  }

  @Put('settings')
  @Permissions([AppPermission.HR_PAYROLL_CONFIG_UPDATE])
  updateSettings(@Body() dto: UpdatePayrollSettingsDto) {
    return this.config.updateSettings(dto);
  }
}
