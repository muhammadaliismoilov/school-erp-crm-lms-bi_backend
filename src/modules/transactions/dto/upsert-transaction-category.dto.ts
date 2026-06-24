import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { TransactionCategoryKind } from '../entities/transaction-category.entity';

export class CreateTransactionCategoryDto {
  @ApiProperty({ example: 'O‘quvchi to‘lovi', maxLength: 120 })
  @IsString({ message: 'Nomi matn bo‘lishi kerak' })
  @Length(1, 120, { message: 'Nomi 1 dan 120 belgigacha bo‘lishi kerak' })
  name: string;

  @ApiPropertyOptional({ enum: TransactionCategoryKind, default: TransactionCategoryKind.BOTH })
  @IsOptional()
  @IsEnum(TransactionCategoryKind, { message: 'kind income, expense yoki both bo‘lishi kerak' })
  kind?: TransactionCategoryKind;

  @ApiPropertyOptional({ format: 'uuid', description: 'Umumiy (ota) kategoriya IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'parentId UUID bo‘lishi kerak' })
  parentId?: string;

  @ApiPropertyOptional({ default: false, description: 'O‘quvchi to‘lovi oqimi (boyitilgan forma).' })
  @IsOptional()
  @IsBoolean({ message: 'isStudentTuition boolean bo‘lishi kerak' })
  isStudentTuition?: boolean;

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

export class UpdateTransactionCategoryDto extends PartialType(CreateTransactionCategoryDto) {}
