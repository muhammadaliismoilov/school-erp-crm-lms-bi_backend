import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateRoomDto } from "./dto/create-room.dto";
import { RoomQueryDto } from "./dto/room-query.dto";
import {
  RoomListResponseEnvelopeDto,
  RoomResponseEnvelopeDto,
} from "./dto/room-response.dto";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { RoomsService } from "./rooms.service";

const uuidParamDocs = {
  name: "id",
  description: "Xona IDsi UUID formatida.",
  example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
};

@ApiTags("Xonalar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true, conflict: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "settings/rooms", version: "1" })
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Permissions([AppPermission.SETTINGS_READ])
  @ApiOperation({
    summary: "Xonalar ro‘yxatini olish",
    description:
      "Faol xonalar qavat va xona raqami bo‘yicha saralanib qaytariladi. Filterlar sozlamalar ekranidagi qidiruv uchun ishlatiladi.",
  })
  @ApiQuery({
    name: "floor",
    required: false,
    type: Number,
    description: "Qavat bo‘yicha filtrlash.",
    example: 1,
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Xona raqami yoki kodi bo‘yicha qidirish.",
    example: "10",
  })
  @ApiOkResponse({
    description: "Xonalar envelope ichida qaytarildi.",
    type: RoomListResponseEnvelopeDto,
  })
  findRooms(@Query() query: RoomQueryDto) {
    return this.roomsService.findRooms(query);
  }

  @Post()
  @Permissions([AppPermission.SETTINGS_MANAGE])
  @ApiOperation({
    summary: "Xona yaratish",
    description:
      "Xona raqamini trim qiladi, unique normalized key yaratadi va faol xonalar ichida duplicate raqamni rad etadi.",
  })
  @ApiBody({
    type: CreateRoomDto,
    examples: {
      firstFloorRoom: {
        summary: "Birinchi qavat xonasi",
        value: { floor: 1, roomNumber: "101" },
      },
      laboratory: {
        summary: "Nomlangan xona kodi",
        value: { floor: 2, roomNumber: "Lab-2" },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Xona envelope ichida yaratildi.",
    type: RoomResponseEnvelopeDto,
  })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto);
  }

  @Get(":id")
  @Permissions([AppPermission.SETTINGS_READ])
  @ApiOperation({
    summary: "Xonani ID bo‘yicha olish",
    description: "Bitta faol xona va qavat labelini qaytaradi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiOkResponse({
    description: "Xona envelope ichida qaytarildi.",
    type: RoomResponseEnvelopeDto,
  })
  findRoom(@Param() params: UuidParamDto) {
    return this.roomsService.findRoom(params.id);
  }

  @Patch(":id")
  @Permissions([AppPermission.SETTINGS_MANAGE])
  @ApiOperation({
    summary: "Xonani tahrirlash",
    description:
      "Qavat va/yoki xona raqamini tahrirlaydi. Bo‘sh payload va duplicate raqamlar rad etiladi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiBody({
    type: UpdateRoomDto,
    examples: {
      moveRoom: {
        summary: "Xonani boshqa qavatga ko‘chirish",
        value: { floor: 2, roomNumber: "201" },
      },
      renameRoom: {
        summary: "Faqat xona raqamini o‘zgartirish",
        value: { roomNumber: "Lab-2" },
      },
    },
  })
  @ApiOkResponse({
    description: "Xona envelope ichida tahrirlandi.",
    type: RoomResponseEnvelopeDto,
  })
  updateRoom(@Param() params: UuidParamDto, @Body() dto: UpdateRoomDto) {
    return this.roomsService.updateRoom(params.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([AppPermission.SETTINGS_MANAGE])
  @ApiOperation({
    summary: "Xonani arxivlash",
    description:
      "Tarixiy bog‘lanishlar saqlanishi uchun xona soft-delete qilinadi.",
  })
  @ApiParam(uuidParamDocs)
  @ApiNoContentResponse({ description: "Xona arxivlandi. Body qaytmaydi." })
  deleteRoom(@Param() params: UuidParamDto) {
    return this.roomsService.deleteRoom(params.id);
  }
}
