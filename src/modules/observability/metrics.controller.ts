import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Operatsion metrikalar')
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  // Prometheus text formati — javob konvertga o'ralsa scraper o'qiy olmaydi.
  @SkipEnvelope()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus metrikalari',
    description:
      'Prometheus scraping uchun Node.js default metrikalari va HTTP request counter/histogramlarini qaytaradi.',
  })
  @ApiOkResponse({ description: 'Prometheus text exposition formati qaytarildi.' })
  metrics(): Promise<string> {
    return this.metricsService.metrics();
  }
}
