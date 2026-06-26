import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class StudentBalanceQueryDto {
  @ApiPropertyOptional({ description: 'Ism yoki o‘quvchi kodi bo‘yicha qidiruv.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf bo‘yicha filtr.' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ enum: ['debtor', 'advance', 'settled'] })
  @IsOptional()
  @IsIn(['debtor', 'advance', 'settled'])
  status?: 'debtor' | 'advance' | 'settled';

  @ApiPropertyOptional({ enum: ['balance', '-balance'], description: 'Saralash; default -balance (qarzdor avval).' })
  @IsOptional()
  @IsIn(['balance', '-balance'])
  sort?: 'balance' | '-balance';

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
