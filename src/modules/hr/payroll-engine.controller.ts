import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { GeneratePayrollRunDto, PayrollRunQueryDto } from './dto/payroll-run.dto';
import { PayrollEngineService } from './payroll-engine.service';

/**
 * Oylik hisoblash dvigateli: davr bo'yicha generatsiya, qayta hisoblash va
 * holat mashinasi (draft → pending_approval → approved → paid → locked).
 */
@ApiTags('HR Payroll Runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'hr/payroll-runs', version: '1' })
export class PayrollEngineController {
  constructor(private readonly engine: PayrollEngineService) {}

  /** Davr uchun barcha faol xodimlarga qoralama oylik yaratish/qayta hisoblash. */
  @Post('generate')
  @Permissions([AppPermission.HR_PAYROLLS_CREATE])
  generate(@Body() dto: GeneratePayrollRunDto) {
    return this.engine.generateForPeriod(dto.period);
  }

  @Get()
  @Permissions([AppPermission.HR_PAYROLLS_READ])
  find(@Query() query: PayrollRunQueryDto) {
    return this.engine.find(query);
  }

  /**
   * Xodimning o'z payslip'lari — maxsus ruxsat talab qilinmaydi (har kim
   * faqat o'zinikini ko'radi; tasdiqlanmagan qoralamalar ko'rinmaydi).
   * Diqqat: ':id' yo'lidan OLDIN turishi shart.
   */
  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.engine.findMine(user.id);
  }

  @Get(':id')
  @Permissions([AppPermission.HR_PAYROLLS_READ])
  get(@Param() p: UuidParamDto) {
    return this.engine.getView(p.id);
  }

  @Post(':id/recalculate')
  @Permissions([AppPermission.HR_PAYROLLS_UPDATE])
  recalculate(@Param() p: UuidParamDto) {
    return this.engine.recalculate(p.id);
  }

  @Post(':id/submit')
  @Permissions([AppPermission.HR_PAYROLLS_UPDATE])
  submit(@Param() p: UuidParamDto) {
    return this.engine.transition(p.id, 'submit');
  }

  @Post(':id/reject')
  @Permissions([AppPermission.HR_PAYROLLS_UPDATE])
  reject(@Param() p: UuidParamDto) {
    return this.engine.transition(p.id, 'reject');
  }

  @Post(':id/approve')
  @Permissions([AppPermission.HR_PAYROLLS_UPDATE])
  approve(@Param() p: UuidParamDto) {
    return this.engine.transition(p.id, 'approve');
  }

  @Post(':id/mark-paid')
  @Permissions([AppPermission.HR_PAYROLLS_UPDATE])
  markPaid(@Param() p: UuidParamDto) {
    return this.engine.transition(p.id, 'mark-paid');
  }

  @Post(':id/lock')
  @Permissions([AppPermission.HR_PAYROLLS_UPDATE])
  lock(@Param() p: UuidParamDto) {
    return this.engine.transition(p.id, 'lock');
  }
}
