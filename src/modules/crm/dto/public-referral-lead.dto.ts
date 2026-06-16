import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

const normalizePhone = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.replace(/[\s()-]/g, "") : value;

/**
 * Public (unauthenticated) lead submission via a referral landing page.
 * Source/status/referralCode are forced server-side — outsiders set none of them.
 */
export class PublicReferralLeadDto {
  @ApiProperty({ example: "Ali", minLength: 1, maxLength: 80 })
  @IsString({ message: "Ism matn formatida bo‘lishi kerak" })
  @Length(1, 80, { message: "Ism uzunligi 1 dan 80 belgigacha bo‘lishi kerak" })
  firstName: string;

  @ApiPropertyOptional({ example: "Valiyev", minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiProperty({ example: "+998901234567" })
  @Transform(normalizePhone)
  @Matches(/^\+998\d{9}$/, {
    message: "Telefon raqam +998 bilan boshlanadigan 12 xonali O‘zbekiston raqami bo‘lishi kerak",
  })
  phone: string;

  /**
   * Honeypot: hidden field never shown to real users. Any non-empty value marks
   * the submission as spam — it is silently discarded.
   */
  @ApiPropertyOptional({ description: "Honeypot — bo‘sh qoldiring.", example: "" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
