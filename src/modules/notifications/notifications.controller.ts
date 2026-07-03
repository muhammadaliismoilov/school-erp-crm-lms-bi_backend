import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateNotificationTemplateDto } from "./dto/create-template.dto";
import { QueueNotificationDto } from "./dto/queue-notification.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Bildirishnomalar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("templates")
  @Permissions([AppPermission.NOTIFICATION_TEMPLATES_READ])
  @ApiOperation({ summary: "Bildirishnoma shablonlari ro‘yxatini olish" })
  @ApiOkResponse({ description: "Bildirishnoma shablonlari qaytarildi." })
  findTemplates() {
    return this.notificationsService.findTemplates();
  }

  @Post("templates")
  @Permissions([AppPermission.NOTIFICATION_TEMPLATES_CREATE])
  @ApiOperation({ summary: "Bildirishnoma shablonini yaratish" })
  @ApiCreatedResponse({ description: "Bildirishnoma shabloni yaratildi." })
  createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Post("queue")
  @Permissions([AppPermission.NOTIFICATION_QUEUE_CREATE])
  @ApiOperation({ summary: "Bildirishnomani yuborish navbatiga qo‘yish" })
  @ApiCreatedResponse({ description: "Bildirishnoma navbatga qo‘yildi." })
  queue(@Body() dto: QueueNotificationDto) {
    return this.notificationsService.queueNotification(dto);
  }
}
