import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UuidParamDto } from "../../common/dto/uuid-param.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { CreateContractDto } from "./dto/create-contract.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { FinanceService } from "./finance.service";

@ApiTags("Moliya")
@ApiBearerAuth()
@ApiLocalizedErrorResponses({ notFound: true })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "finance", version: "1" })
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("contracts")
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: "Shartnomalar ro‘yxatini olish" })
  @ApiOkResponse({ description: "Shartnomalar qaytarildi." })
  findContracts() {
    return this.financeService.findContracts();
  }

  @Post("contracts")
  @Permissions([AppPermission.FINANCE_MANAGE])
  @ApiOperation({ summary: "O‘quvchi shartnomasini yaratish" })
  @ApiCreatedResponse({ description: "Shartnoma yaratildi." })
  createContract(@Body() dto: CreateContractDto) {
    return this.financeService.createContract(dto);
  }

  @Post("contracts/:id/payments")
  @Permissions([AppPermission.FINANCE_MANAGE])
  @ApiOperation({ summary: "Shartnoma bo‘yicha to‘lov kiritish" })
  @ApiCreatedResponse({ description: "To‘lov yozildi." })
  recordPayment(@Param() params: UuidParamDto, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordPayment(params.id, dto);
  }

  @Get("contracts/:id/debt")
  @Permissions([AppPermission.FINANCE_READ])
  @ApiOperation({ summary: "Shartnoma qarzdorligini hisoblash" })
  @ApiOkResponse({ description: "Qarzdorlik xulosasi qaytarildi." })
  getDebt(@Param() params: UuidParamDto) {
    return this.financeService.getDebt(params.id);
  }
}
