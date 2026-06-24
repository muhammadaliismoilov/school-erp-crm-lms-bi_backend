import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

/** Faqat "kutilmoqda" holatidagi so'rovni qisman tahrirlash. */
export class UpdateGradeRequestDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Fan IDsi UUID formatida bo‘lishi kerak' })
  subjectId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Chorak IDsi UUID formatida bo‘lishi kerak' })
  quarterId?: string;

  @ApiPropertyOptional({ example: 3, minimum: 0, maximum: 100, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Joriy baho son bo‘lishi kerak' })
  @Min(0, { message: 'Joriy baho 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Joriy baho 100 dan oshmasligi kerak' })
  currentGrade?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Yangi baho son bo‘lishi kerak' })
  @Min(0, { message: 'Yangi baho 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Yangi baho 100 dan oshmasligi kerak' })
  requestedGrade?: number;

  @ApiPropertyOptional({ minLength: 3, maxLength: 2000 })
  @IsOptional()
  @IsString({ message: 'Sabab matn bo‘lishi kerak' })
  @Length(3, 2000, { message: 'Sabab 3 dan 2000 belgigacha bo‘lishi kerak' })
  reason?: string;
}
