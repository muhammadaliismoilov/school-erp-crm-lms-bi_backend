import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateClassLeaderAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsISO8601()
  startDate: string;

  @ApiPropertyOptional({ example: '2027-05-31', description: 'Bo‘sh — hozirgacha davom etadi.' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}

/** Yopish/tuzatish: odatda endDate qo‘yiladi (rahbarlik boshqa o‘qituvchiga o‘tganda). */
export class UpdateClassLeaderAssignmentDto {
  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}

export class ClassLeaderQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Shu sanada faol bo‘lganlar.' })
  @IsOptional()
  @IsISO8601()
  activeOn?: string;
}
