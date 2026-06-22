import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/** O‘quvchini o‘chirish (soft-delete) paytidagi ketish sababi. */
export class WithdrawStudentDto {
  @ApiPropertyOptional({ description: "Ketish/o‘chirish sababi", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
