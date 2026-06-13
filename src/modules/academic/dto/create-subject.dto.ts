import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const normalizeCode = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const normalizeHexColor = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Fan nomi. UI kartalarda asosiy nom sifatida ko‘rsatiladi.',
    example: 'Matematika',
    minLength: 1,
    maxLength: 120,
  })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiProperty({
    description: 'Fanning ruscha nomi. UI dagi “Ruscha nomi” qatori uchun ishlatiladi.',
    example: 'Matematika',
    minLength: 1,
    maxLength: 120,
  })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  russianName: string;

  @ApiProperty({
    description: 'Fan kartasi va formadagi rang. HEX formatda bo‘lishi kerak.',
    example: '#2563EB',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @Transform(({ value }) => normalizeHexColor(value))
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/)
  color: string;

  @ApiPropertyOptional({
    description: 'Inglizcha nom. Berilmasa asosiy nomdan olinadi.',
    example: 'Mathematics',
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  englishName?: string;

  @ApiPropertyOptional({
    description: 'Fan kodi. Berilmasa backend fan nomidan avtomatik kod yaratadi.',
    example: 'MATEMATIKA',
    minLength: 2,
    maxLength: 40,
    pattern: '^[A-Z0-9_-]+$',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Length(2, 40)
  @Matches(/^[A-Z0-9_-]+$/)
  code?: string;

  @ApiPropertyOptional({
    description: 'Fan haqida qisqa izoh.',
    example: 'Boshlang‘ich va yuqori sinflar uchun matematika fani.',
    minLength: 1,
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 500)
  description?: string;
}
