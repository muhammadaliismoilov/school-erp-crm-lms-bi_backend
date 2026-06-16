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
import { PublicReferralLeadDto } from "./dto/public-referral-lead.dto";
import { PublicReferralInfoDto } from "./dto/referral-response.dto";
import { ReferralsService } from "./referrals.service";

/**
 * Unauthenticated public surface for referral landing pages. No JwtAuthGuard —
 * intentionally open. Rate-limited tighter than the default; honeypot-guarded.
 */
@ApiTags("Public referallar")
@ApiLocalizedErrorResponses({ notFound: true })
@Controller({ path: "public/referral", version: "1" })
export class PublicReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get(":code")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Referal kodini tekshirish va landing ma’lumotini olish" })
  @ApiParam({ name: "code", description: "Public referal kodi." })
  @ApiResponse({ status: HttpStatus.OK, type: PublicReferralInfoDto })
  async validate(@Param("code") code: string) {
    try {
      return await this.referralsService.validatePublicReferral(code);
    } catch (error) {
      this.handleError(error, "Referalni tekshirishda server xatosi yuz berdi");
    }
  }

  @Post(":code/leads")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Referal orqali lid (kontakt) yuborish" })
  @ApiParam({ name: "code", description: "Public referal kodi." })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Kontakt qabul qilindi." })
  async submit(@Param("code") code: string, @Body() dto: PublicReferralLeadDto) {
    try {
      return await this.referralsService.submitPublicLead(code, dto);
    } catch (error) {
      this.handleError(error, "Kontakt yuborishda server xatosi yuz berdi");
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException(fallbackMessage);
  }
}
