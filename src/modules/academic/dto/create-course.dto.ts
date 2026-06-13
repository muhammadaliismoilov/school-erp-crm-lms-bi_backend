import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateCourseDto {
  @ApiProperty({
    description: 'Kurs nomi. UI kartada asosiy sarlavha sifatida ko‘rsatiladi.',
    example: 'IT',
    minLength: 1,
    maxLength: 160,
  })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiProperty({
    description: 'Kurs tegishli bo‘lgan chorak IDsi.',
    example: '5c617a45-57a4-4864-89c8-96e299173908',
    format: 'uuid',
  })
  @IsUUID()
  quarterId: string;

  @ApiProperty({
    description: 'Kurs boshlanish sanasi. YYYY-MM-DD formatida.',
    example: '2026-03-26',
    format: 'date',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @ApiProperty({
    description: 'Kurs tugash sanasi. YYYY-MM-DD formatida.',
    example: '2026-06-15',
    format: 'date',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;

  @ApiProperty({
    description: 'Kurs o‘tiladigan xona IDsi.',
    example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    format: 'uuid',
  })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({
    description: 'Kurs haqida qisqa tavsif.',
    example: 'Frontend va kompyuter savodxonligi kursi.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiProperty({
    description: 'Kurs fani IDsi.',
    example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
    format: 'uuid',
  })
  @IsUUID()
  subjectId: string;

  @ApiProperty({
    description: 'Kurs o‘qituvchisi foydalanuvchi IDsi.',
    example: '42f35a94-92b4-4f1a-8a7a-90a78003892d',
    format: 'uuid',
  })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Rejalashtirilgan darslar soni. UI dagi 0/0 hisoblagichning o‘ng tomoni.',
    example: 24,
    minimum: 0,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  plannedLessonCount?: number;

  @ApiPropertyOptional({
    description: 'Kursga dastlab biriktiriladigan o‘quvchilar IDlari.',
    example: ['77f35a94-92b4-4f1a-8a7a-90a78003892d'],
    type: [String],
    format: 'uuid',
    maxItems: 200,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
