import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { DbHealthService } from '../../common/database/db-health/db-health.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { DbHealthResponseSchema } from './swagger/db-health-response.schema';

/**
 * Baza sog'lig'i paneli uchun batafsil ma'lumot.
 *
 * NEGA `HealthController` DA EMAS: u ATAYLAB autentifikatsiyasiz
 * (`/api/v1/health` — konteyner sog'lig'ini tekshirish uchun). Bu yo'lni o'sha
 * kontrollerga qo'shish uni ham ochiq internetga chiqarardi.
 *
 * NEGA `/metrics` EMAS: Prometheus endpointi alohida, ichki portda (T-03) va
 * brauzerga umuman ochilmagan. Bu yerdagi javob esa qat'iy chegaralangan —
 * daraja, uchta raqam va sabab belgilari; hech qanday so'rov matni, jadval
 * nomi yoki pool sig'imi chiqmaydi.
 */
@ApiTags('Tizim')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'system', version: '1' })
export class SystemHealthController {
  constructor(private readonly dbHealth: DbHealthService) {}

  @Get('db-health')
  @Permissions([AppPermission.SYSTEM_MONITOR])
  @ApiOperation({
    summary: 'Baza yuklamasining joriy holati',
    description:
      'Chiroq bosilganda ochiladigan panel uchun. Bazaga so‘rov YUBORMAYDI — ' +
      'barcha qiymatlar xotiradagi hisoblagichlardan olinadi.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: DbHealthResponseSchema })
  getDbHealth(): DbHealthResponseSchema {
    return this.dbHealth.snapshot();
  }
}
