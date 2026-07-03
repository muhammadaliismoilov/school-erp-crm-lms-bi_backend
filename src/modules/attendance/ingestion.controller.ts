import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IngestTurnstileEventsDto } from './dto/ingest-turnstile-events.dto';
import { TurnstileDevice } from './entities/turnstile-device.entity';
import { DeviceAuthGuard, TURNSTILE_DEVICE_KEY } from './guards/device-auth.guard';
import { IngestionService } from './ingestion.service';

@ApiTags('Turniket ingestion')
@ApiSecurity('device-key')
@UseGuards(DeviceAuthGuard)
@Controller({ path: 'turnstile', version: '1' })
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('events')
  @ApiOperation({
    summary: 'Turniket o‘tish hodisalarini qabul qilish (batch, idempotent)',
    description:
      'Qurilma `X-Device-Number` va `X-Device-Key` sarlavhalari bilan autentifikatsiya qilinadi. ' +
      'Hodisalar idempotent yoziladi — takrorlar e’tiborsiz qoldiriladi. Oflayn bufer uchun ' +
      'bir so‘rovda 500 tagacha hodisa yuborsa bo‘ladi.',
  })
  @ApiOkResponse({ description: 'Qabul natijasi (accepted/duplicates/unresolved).' })
  async ingest(@Req() req: Request, @Body() dto: IngestTurnstileEventsDto) {
    const device = (req as Request & Record<string, unknown>)[TURNSTILE_DEVICE_KEY] as TurnstileDevice;
    const result = await this.ingestion.ingest(device, dto.events);
    return {
      accepted: result.accepted,
      duplicates: result.duplicates,
      unresolved: result.unresolved,
    };
  }
}
