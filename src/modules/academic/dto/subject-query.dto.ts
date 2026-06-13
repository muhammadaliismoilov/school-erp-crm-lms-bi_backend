import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class SubjectQueryDto {
  @ApiPropertyOptional({
    description: 'Fan nomi yoki kodi bo‘yicha qidiruv.',
    example: 'mat',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Fan holati bo‘yicha filter.',
    enum: CommonStatus,
    example: CommonStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;
}
