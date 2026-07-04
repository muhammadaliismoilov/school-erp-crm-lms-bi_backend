import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsISO8601()
  date: string;

  @ApiProperty({ example: 'Mustaqillik kuni' })
  @IsString()
  @Length(1, 160)
  name: string;
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class HolidayQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Shu sanadan (shu kun kiradi).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Shu sanagacha (shu kun kiradi).' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
