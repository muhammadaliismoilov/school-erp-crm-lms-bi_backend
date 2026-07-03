import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationChannelType } from '../../common/enums/notification-enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { ApiLocalizedErrorResponses } from '../../common/swagger/api-localized-error-responses.decorator';
import { RegisterChannelDto } from './dto/register-channel.dto';
import { NotificationChannelService } from './notification-channel.service';

/**
 * Foydalanuvchi (asosan ota-ona) o'z xabar kanalini boshqaradi — mobil ilova
 * push tokenini yoki Telegram chat_id sini ro'yxatga oladi. Faqat o'z kanallari.
 */
@ApiTags('Xabar kanallari')
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notification-channels', version: '1' })
export class NotificationChannelController {
  constructor(private readonly service: NotificationChannelService) {}

  @Get()
  @ApiOperation({ summary: 'O‘z xabar kanallarim' })
  @ApiOkResponse({ description: 'Kanallar ro‘yxati.' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listOwn(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Xabar kanalini ro‘yxatga olish / yangilash' })
  @ApiOkResponse({ description: 'Kanal saqlandi.' })
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterChannelDto) {
    return this.service.register(user.id, dto);
  }

  @Delete(':type')
  @ApiOperation({ summary: 'Xabar kanalini o‘chirish' })
  @ApiOkResponse({ description: 'Kanal o‘chirildi.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('type') type: NotificationChannelType) {
    return this.service.remove(user.id, type);
  }
}
