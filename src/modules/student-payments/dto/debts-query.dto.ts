import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

/** O'quvchilar qarzlari matritsasi uchun filtr/sahifalash. */
export class DebtsQueryDto {
  @ApiPropertyOptional({ description: 'Ism yoki guruh bo‘yicha qidiruv.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf filtri.' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ enum: ['unpaid', 'partial', 'paid'], description: 'Holat: to‘lanmagan / qisman / to‘liq.' })
  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid'])
  status?: 'unpaid' | 'partial' | 'paid';

  @ApiPropertyOptional({ example: '2025-09', description: 'Tanlangan oy (YYYY-MM) — holat filtri shu oyga nisbatan.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, enum: [10, 20, 50, 100] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 50, 100])
  limit?: number;
}
