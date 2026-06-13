import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { SchoolType } from '../enums/school.enums';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class SchoolQueryDto {
  @ApiPropertyOptional({ description: 'Maktab nomi, yuridik nomi, manzil yoki telefon bo‘yicha qidiruv.', example: 'imkon', maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 160)
  search?: string;

  @ApiPropertyOptional({ description: 'Maktab turi bo‘yicha filter.', enum: SchoolType })
  @IsOptional()
  @IsEnum(SchoolType)
  schoolType?: SchoolType;

  @ApiPropertyOptional({ description: 'Maktab holati bo‘yicha filter.', enum: CommonStatus })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;

  @ApiPropertyOptional({ description: 'Sahifa raqami.', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Bitta sahifadagi elementlar soni.', example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
