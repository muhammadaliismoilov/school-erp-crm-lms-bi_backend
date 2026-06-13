import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const roomSearchPattern = /^[A-Za-z0-9 ._/-]+$/;

const trimSearch = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class RoomQueryDto {
  @ApiPropertyOptional({
    description: 'Filter rooms by floor.',
    example: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  floor?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive partial search by room number/code.',
    example: '10',
    minLength: 1,
    maxLength: 32,
    pattern: '^[A-Za-z0-9 ._/-]+$',
  })
  @IsOptional()
  @Transform(({ value }) => trimSearch(value))
  @IsString()
  @Length(1, 32)
  @Matches(roomSearchPattern)
  search?: string;
}
