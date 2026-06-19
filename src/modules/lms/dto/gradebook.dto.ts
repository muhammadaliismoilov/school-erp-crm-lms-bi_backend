import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';
import { WalletTransactionType } from '../../gamification/enums/gamification.enums';

/** Query for the electronic journal grid: one class + subject + quarter. */
export class GradebookQueryDto {
  @ApiProperty({ format: 'uuid', description: 'Sinf IDsi.' })
  @IsUUID('4', { message: 'Sinf IDsi UUID formatida bo‘lishi kerak' })
  classId: string;

  @ApiProperty({ format: 'uuid', description: 'Fan IDsi.' })
  @IsUUID('4', { message: 'Fan IDsi UUID formatida bo‘lishi kerak' })
  subjectId: string;

  @ApiProperty({ format: 'uuid', description: 'Chorak IDsi.' })
  @IsUUID('4', { message: 'Chorak IDsi UUID formatida bo‘lishi kerak' })
  quarterId: string;
}

/** Upsert a single journal cell (student × lesson). */
export class UpsertGradeDto {
  @ApiProperty({ format: 'uuid', description: 'Dars (lesson) IDsi.' })
  @IsUUID('4', { message: 'Dars IDsi UUID formatida bo‘lishi kerak' })
  lessonId: string;

  @ApiProperty({ format: 'uuid', description: 'O‘quvchi IDsi.' })
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID formatida bo‘lishi kerak' })
  studentId: string;

  @ApiPropertyOptional({
    description: 'Baho (1–5). null yuborilsa baho o‘chiriladi.',
    minimum: 1,
    maximum: 5,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Baho butun son bo‘lishi kerak' })
  @Min(1, { message: 'Baho 1 dan kichik bo‘lmasligi kerak' })
  @Max(5, { message: 'Baho 5 dan katta bo‘lmasligi kerak' })
  grade?: number | null;

  @ApiPropertyOptional({ description: '100 ballik baho (0–100). null o‘chiradi.', minimum: 0, maximum: 100, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Ball butun son bo‘lishi kerak' })
  @Min(0, { message: 'Ball 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Ball 100 dan katta bo‘lmasligi kerak' })
  ball?: number | null;

  @ApiPropertyOptional({ enum: AttendanceStatus, description: 'Davomat. null o‘chiradi.', nullable: true })
  @IsOptional()
  @IsEnum(AttendanceStatus, { message: 'Davomat qiymati noto‘g‘ri' })
  attendance?: AttendanceStatus | null;

  @ApiPropertyOptional({ description: 'Uy vazifasi bajarilganmi.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Uy vazifasi qiymati boolean bo‘lishi kerak' })
  homeworkDone?: boolean;

  @ApiPropertyOptional({ description: 'Izoh.', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Izoh matn bo‘lishi kerak' })
  @MaxLength(500, { message: 'Izoh 500 belgidan oshmasligi kerak' })
  comment?: string;
}

/** Choraklik yakuniy baho (o‘quvchi × fan × chorak). */
export class QuarterGradeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') studentId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') subjectId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') quarterId: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) grade?: number | null;
  @ApiPropertyOptional({ minimum: 0, maximum: 100, nullable: true })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) ball?: number | null;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

/** Tanlangan sinf+fan+chorak uchun darslarni jadvaldan materializatsiya qilish. */
export class GenerateJournalLessonsDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') subjectId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') quarterId: string;
}

/** Jurnal katagidan tanga berish/ayrish. */
export class AwardJournalCoinDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') studentId: string;
  @ApiProperty({ enum: WalletTransactionType }) @IsEnum(WalletTransactionType) type: WalletTransactionType;
  @ApiProperty({ minimum: 1, maximum: 1000000 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) amount: number;
  @ApiProperty() @IsString() @Length(1, 180) reason: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Manba dars IDsi.' })
  @IsOptional() @IsUUID('4') lessonId?: string;
}

export class StudentProgressQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') quarterId?: string;
}

/** A lesson column in the journal grid. */
export class GradebookLessonDto {
  @ApiProperty() id: string;
  @ApiProperty({ format: 'date' }) lessonDate: string;
  @ApiPropertyOptional({ nullable: true }) topic?: string | null;
  @ApiProperty() status: string;
}

/** A student row in the journal grid. */
export class GradebookStudentDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
  @ApiProperty() studentCode: string;
  @ApiPropertyOptional({ nullable: true, description: 'Chorakdagi o‘rtacha baho.' })
  average?: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Choraklik yakuniy baho (1–5).' })
  quarterGrade?: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Choraklik yakuniy ball (0–100).' })
  quarterBall?: number | null;
  @ApiPropertyOptional({ nullable: true }) quarterComment?: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Davomat foizi (0–100).' })
  attendancePct?: number | null;
}

/** One filled cell. */
export class GradebookCellDto {
  @ApiProperty() lessonId: string;
  @ApiProperty() studentId: string;
  @ApiPropertyOptional({ nullable: true }) grade?: number | null;
  @ApiPropertyOptional({ nullable: true }) ball?: number | null;
  @ApiPropertyOptional({ enum: AttendanceStatus, nullable: true }) attendance?: AttendanceStatus | null;
  @ApiProperty() homeworkDone: boolean;
  @ApiPropertyOptional({ nullable: true }) comment?: string | null;
}

export class GradebookStatsDto {
  @ApiProperty() studentCount: number;
  @ApiProperty() lessonCount: number;
  @ApiPropertyOptional({ nullable: true }) averageGrade?: number | null;
  @ApiProperty() excellentCount: number;
  @ApiProperty({ description: 'Davomat foizi (0–100).' }) attendancePct: number;
}

export class GradebookResponseDto {
  @ApiProperty({ type: [GradebookLessonDto] }) lessons: GradebookLessonDto[];
  @ApiProperty({ type: [GradebookStudentDto] }) students: GradebookStudentDto[];
  @ApiProperty({ type: [GradebookCellDto] }) cells: GradebookCellDto[];
  @ApiProperty({ type: GradebookStatsDto }) stats: GradebookStatsDto;
}
