import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { CreateTurnstileDeviceDto, UpdateTurnstileDeviceDto } from './dto/turnstile-device.dto';
import { DeviceWithKey, TurnstileDeviceService } from './turnstile-device.service';

/** Ochiq API kalit faqat yaratish/rotatsiyada bir marta qaytariladi. */
function present(result: DeviceWithKey) {
  return {
    id: result.device.id,
    deviceNumber: result.device.deviceNumber,
    name: result.device.name,
    direction: result.device.direction,
    active: result.device.active,
    apiKey: result.apiKey,
  };
}

@ApiTags('Turniket qurilmalari')
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'turnstile-devices', version: '1' })
export class TurnstileDeviceController {
  constructor(private readonly service: TurnstileDeviceService) {}

  @Get()
  @Permissions([AppPermission.TURNSTILE_DEVICES_READ])
  @ApiOperation({ summary: 'Turniket qurilmalari ro‘yxati' })
  @ApiOkResponse({ description: 'Qurilmalar ro‘yxati.' })
  list() {
    return this.service.list();
  }

  @Post()
  @Permissions([AppPermission.TURNSTILE_DEVICES_CREATE])
  @ApiOperation({
    summary: 'Yangi qurilma ro‘yxatga olish',
    description: 'Javobda API kalit BIR MARTA qaytariladi — uni saqlab qo‘ying.',
  })
  @ApiCreatedResponse({ description: 'Qurilma yaratildi (apiKey bilan).' })
  async create(@Body() dto: CreateTurnstileDeviceDto) {
    return present(await this.service.create(dto));
  }

  @Patch(':id')
  @Permissions([AppPermission.TURNSTILE_DEVICES_UPDATE])
  @ApiOperation({ summary: 'Qurilmani tahrirlash (nom/yo‘nalish/faollik)' })
  @ApiOkResponse({ description: 'Qurilma yangilandi.' })
  update(@Param('id') id: string, @Body() dto: UpdateTurnstileDeviceDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/rotate-key')
  @Permissions([AppPermission.TURNSTILE_DEVICES_UPDATE])
  @ApiOperation({ summary: 'API kalitni qayta generatsiya qilish' })
  @ApiOkResponse({ description: 'Yangi apiKey qaytarildi (bir marta).' })
  async rotateKey(@Param('id') id: string) {
    return present(await this.service.rotateKey(id));
  }

  @Delete(':id')
  @Permissions([AppPermission.TURNSTILE_DEVICES_DELETE])
  @ApiOperation({ summary: 'Qurilmani o‘chirish' })
  @ApiOkResponse({ description: 'Qurilma o‘chirildi.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
