import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export enum ReferralStatusFilter {
  ACTIVE = "active",
  EXPIRED = "expired",
}

export class ReferralQueryDto extends PaginationQueryDto {
  // `search` (nom bo'yicha qidiruv) PaginationQueryDto'dan meros.

  @ApiPropertyOptional({ enum: ReferralStatusFilter, description: "Holat bo'yicha filter." })
  @IsOptional()
  @IsEnum(ReferralStatusFilter)
  status?: ReferralStatusFilter;
}
