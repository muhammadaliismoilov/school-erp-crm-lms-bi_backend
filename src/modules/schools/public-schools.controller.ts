import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { ResolveSchoolQueryDto } from './dto/resolve-school-query.dto';
import { ResolveSchoolResponseEnvelopeDto } from './dto/resolve-school-response.dto';
import { SchoolsService } from './schools.service';

/**
 * Unauthenticated public surface — subdomain -> maktab aniqlash uchun
 * (frontend tenant middleware, login sahifasidan oldin chaqiradi).
 * JwtAuthGuard qo'llanilmaydi — ataylab ochiq, throttle bilan cheklangan.
 */
@ApiTags('Public maktab aniqlash')
@ApiLocalizedErrorResponses({ notFound: true })
@Controller({ path: 'public/schools', version: '1' })
export class PublicSchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('resolve')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Hostname bo‘yicha maktabni aniqlash',
    description:
      'Subdomain (masalan elegantschool.crm.uz) qaysi maktabga tegishli ekanini qaytaradi. `admin.crm.uz` va noma\'lum hostname uchun 404 qaytadi.',
  })
  @ApiOkResponse({ type: ResolveSchoolResponseEnvelopeDto })
  async resolve(@Query() query: ResolveSchoolQueryDto) {
    const result = await this.schoolsService.resolveByHostname(query.hostname);

    if (!result) {
      throw new NotFoundException('School not found for this hostname');
    }

    return result;
  }
}
