import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentTypeDto {
  @ApiProperty({ example: 'Naqd', maxLength: 80 })
  @IsString({ message: 'Nomi matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Nomi 1 dan 80 belgigacha bo‘lishi kerak' })
  name: string;

  @ApiPropertyOptional({ example: 'cash', maxLength: 40, description: 'Mashinaga mos kod. Berilmasa nomdan hosil qilinadi.' })
  @IsOptional()
  @IsString({ message: 'Kod matn bo‘lishi kerak' })
  @Length(1, 40, { message: 'Kod 1 dan 40 belgigacha bo‘lishi kerak' })
  code?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive boolean bo‘lishi kerak' })
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder butun son bo‘lishi kerak' })
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdatePaymentTypeDto extends PartialType(CreatePaymentTypeDto) {}
