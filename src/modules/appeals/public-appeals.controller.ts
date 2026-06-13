import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { PublicCreateAppealDto } from "./dto/public-create-appeal.dto";
import { AppealsService } from "./appeals.service";
import { PublicAppealLinkInfoSchema } from "./swagger/appeal-public-link.schema";

/**
 * Unauthenticated public surface for appeal submission via a shared link.
 * No JwtAuthGuard — intentionally open. Rate-limited tighter than the default.
 */
@ApiTags("Public murojaatlar")
@ApiLocalizedErrorResponses({ notFound: true })
@Controller({ path: "public/appeals", version: "1" })
export class PublicAppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: "Public havola tokenini tekshirish",
    description: "Token faolligini tekshiradi va public forma sarlavhasini qaytaradi.",
  })
  @ApiParam({ name: "token", description: "Public havola tokeni." })
  @ApiResponse({ status: HttpStatus.OK, type: PublicAppealLinkInfoSchema })
  async validate(@Param("token") token: string) {
    try {
      return await this.appealsService.validatePublicToken(token);
    } catch (error) {
      this.handleError(error, "Havolani tekshirishda server xatosi yuz berdi");
    }
  }

  @Post(":token")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: "Public murojaat yuborish",
    description:
      "Tashqi foydalanuvchi (ota-ona/o‘quvchi) auth talab qilmasdan taklif yoki shikoyat yuboradi.",
  })
  @ApiParam({ name: "token", description: "Public havola tokeni." })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Murojaat qabul qilindi." })
  async submit(@Param("token") token: string, @Body() dto: PublicCreateAppealDto) {
    try {
      return await this.appealsService.createPublicAppeal(token, dto);
    } catch (error) {
      this.handleError(error, "Murojaat yuborishda server xatosi yuz berdi");
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(fallbackMessage);
  }
}
