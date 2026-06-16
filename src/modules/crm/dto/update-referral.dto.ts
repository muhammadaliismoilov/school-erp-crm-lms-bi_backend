import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateReferralDto } from "./create-referral.dto";

export class UpdateReferralDto extends PartialType(CreateReferralDto) {
  @ApiPropertyOptional({ description: "Referalni faollashtirish/o'chirish." })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
