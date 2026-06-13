import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppPermission } from "../../common/constants/permissions";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ApiLocalizedErrorResponses } from "../../common/swagger/api-localized-error-responses.decorator";
import { PermissionCatalogResponseSchema } from "./swagger/permission-catalog.schema";
import { RolesService } from "./roles.service";

@ApiTags("Imtiyozlar")
@ApiBearerAuth()
@ApiLocalizedErrorResponses()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: "permissions", version: "1" })
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("catalog")
  @Permissions([AppPermission.ROLES_READ])
  @ApiOperation({
    summary: "Imtiyozlar katalogi",
    description:
      "Barcha imtiyozlarni kategoriya → resurs → amal daraxtiga guruhlab, lokalizatsiyalangan label va sanoqlar bilan qaytaradi. Rol yaratish/tahrirlash formasidagi imtiyozlar daraxti uchun ishlatiladi.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Imtiyozlar katalogi muvaffaqiyatli qaytarildi.",
    type: PermissionCatalogResponseSchema,
  })
  async getCatalog() {
    try {
      return await this.rolesService.getPermissionCatalog();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Imtiyozlar katalogini olishda server xatosi yuz berdi",
      );
    }
  }
}
