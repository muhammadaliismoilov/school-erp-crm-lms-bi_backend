import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { LocalizedText } from '../../../common/i18n/locale';
import { ExamKind, ExamStatus, ExamType } from '../enums/lms.enums';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Sinf imtihonini tayinlash. */
export class CreateClassExamDto {
  @ApiPropertyOptional({ description: 'Imtihon nomi (bo‘sh bo‘lsa avtomatik tuziladi).', maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(2, 160)
  title?: string;

  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() teacherId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;

  @ApiProperty({ enum: ExamType }) @IsEnum(ExamType) examType: ExamType;

  @ApiProperty({ format: 'date', example: '2026-06-23' })
  @IsISO8601({ strict: true })
  @Matches(DATE_RE)
  examDate: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Natija kiritish oynasi boshi.' })
  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Natija kiritish oynasi oxiri.' })
  @IsOptional()
  @IsISO8601()
  availableUntil?: string;

  @ApiPropertyOptional({ minimum: 1, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;
}

/** Kurs imtihonini tayinlash. */
export class CreateCourseExamDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(2, 160)
  title?: string;

  @ApiProperty({ format: 'uuid' }) @IsUUID() courseId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;

  @ApiProperty({ enum: ExamType }) @IsEnum(ExamType) examType: ExamType;

  @ApiProperty({ format: 'date', example: '2026-06-23' })
  @IsISO8601({ strict: true })
  @Matches(DATE_RE)
  examDate: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  availableUntil?: string;

  @ApiPropertyOptional({ minimum: 1, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;
}

/** Imtihonni yangilash (sinf yoki kurs — barcha maydonlar ixtiyoriy). */
export class UpdateExamDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(2, 160)
  title?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() classId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() subjectId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() quarterId?: string;

  @ApiPropertyOptional({ enum: ExamType }) @IsOptional() @IsEnum(ExamType) examType?: ExamType;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_RE)
  examDate?: string;

  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() availableFrom?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() availableUntil?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ enum: ExamStatus }) @IsOptional() @IsEnum(ExamStatus) status?: ExamStatus;
}

/** Imtihonlar ro'yxati filtri. */
export class ExamQueryDto {
  @ApiPropertyOptional({ enum: ExamKind, description: 'Rejim: sinf yoki kurs imtihoni.' })
  @IsOptional()
  @IsEnum(ExamKind)
  kind?: ExamKind;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 160)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() quarterId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarterNumber?: number;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() classId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() subjectId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() courseId?: string;

  @ApiPropertyOptional({ enum: ExamType }) @IsOptional() @IsEnum(ExamType) examType?: ExamType;
  @ApiPropertyOptional({ enum: ExamStatus }) @IsOptional() @IsEnum(ExamStatus) status?: ExamStatus;

  @ApiPropertyOptional({ format: 'date', example: '2026-06-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_RE)
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-06-30' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_RE)
  dateTo?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ExamTeacherQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() classId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() subjectId?: string;
}

// ----------------------------- Response shapes -----------------------------

export interface ExamRefBrief {
  id: string;
  name: LocalizedText | string;
}

export class ExamResponseDto {
  id: string;
  title: string;
  examKind: ExamKind;
  examType: ExamType;
  classId: string | null;
  className: string | null;
  subjectId: string | null;
  subjectName: LocalizedText | null;
  teacherId: string | null;
  teacherName: string | null;
  courseId: string | null;
  courseName: string | null;
  quarterId: string | null;
  quarterName: LocalizedText | null;
  quarterNumber: number | null;
  examDate: string;
  availableFrom: string | null;
  availableUntil: string | null;
  maxScore: number;
  status: ExamStatus;
  resultCount: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ExamStatsDto {
  total: number;
  draft: number;
  scheduled: number;
  finished: number;
  withResults: number;
}

export class ExamListResponseDto {
  items: ExamResponseDto[];
  stats: ExamStatsDto;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// PartialType saqlanadi (orqaga moslik uchun eski LMS DTO importlari ham mavjud).
export class CreateExamDto extends CreateClassExamDto {}
export class ExamPatchDto extends PartialType(CreateClassExamDto) {}
