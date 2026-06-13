import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
}

/** One filled cell. */
export class GradebookCellDto {
  @ApiProperty() lessonId: string;
  @ApiProperty() studentId: string;
  @ApiPropertyOptional({ nullable: true }) grade?: number | null;
  @ApiProperty() homeworkDone: boolean;
  @ApiPropertyOptional({ nullable: true }) comment?: string | null;
}

export class GradebookResponseDto {
  @ApiProperty({ type: [GradebookLessonDto] }) lessons: GradebookLessonDto[];
  @ApiProperty({ type: [GradebookStudentDto] }) students: GradebookStudentDto[];
  @ApiProperty({ type: [GradebookCellDto] }) cells: GradebookCellDto[];
}
