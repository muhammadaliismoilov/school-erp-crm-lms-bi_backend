import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassLanguage } from './create-class.dto';

export class ClassAcademicYearBriefDto {
  @ApiProperty({ example: '5c617a45-57a4-4864-89c8-96e299173908', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2025/2026' })
  name: string;
}

export class ClassRoomBriefDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '101' })
  roomNumber: string;

  @ApiProperty({ example: 1 })
  floor: number;

  @ApiProperty({ example: '1-qavat 101' })
  label: string;
}

export class ClassCuratorBriefDto {
  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Aziz Toshmatov' })
  fullName: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  phone?: string | null;
}

export class ClassStatsDto {
  @ApiProperty({ example: 10 })
  studentCount: number;

  @ApiProperty({ example: 5 })
  maleCount: number;

  @ApiProperty({ example: 5 })
  femaleCount: number;

  @ApiProperty({ example: 0, minimum: 0, maximum: 5 })
  averageMastery: number;

  @ApiProperty({ example: 98, minimum: 0, maximum: 100 })
  averageAttendance: number;
}

export class ClassStudentRowDto {
  @ApiProperty({ example: '2c617a45-57a4-4864-89c8-96e299173908', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Abdullayeva Hilola' })
  fullName: string;

  @ApiPropertyOptional({ example: 'female', enum: ['male', 'female', 'other'] })
  gender?: string | null;

  @ApiPropertyOptional({ example: 'S-0001' })
  studentCode?: string | null;

  @ApiProperty({ example: 0, minimum: 0, maximum: 5 })
  mastery: number;

  @ApiProperty({ example: 99, minimum: 0, maximum: 100 })
  attendance: number;
}

export class ClassResponseDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '1-A' })
  name: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  gradeLevel: number;

  @ApiProperty({ example: 'A' })
  section: string;

  @ApiProperty({ enum: ClassLanguage, example: ClassLanguage.UZ })
  language: ClassLanguage | string;

  @ApiProperty({ type: ClassAcademicYearBriefDto })
  academicYear: ClassAcademicYearBriefDto;

  @ApiProperty({ type: ClassRoomBriefDto })
  room: ClassRoomBriefDto;

  @ApiProperty({ type: ClassCuratorBriefDto })
  curator: ClassCuratorBriefDto;

  @ApiProperty({ type: ClassStatsDto })
  stats: ClassStatsDto;

  @ApiPropertyOptional({ example: 30 })
  capacity?: number;

  @ApiPropertyOptional({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class ClassDetailResponseDto extends ClassResponseDto {
  @ApiProperty({ type: [ClassStudentRowDto] })
  students: ClassStudentRowDto[];
}

export class TransferClassStudentsResponseDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  sourceClassId: string;

  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  targetClassId: string;

  @ApiProperty({ example: 10 })
  movedStudentCount: number;
}

export class ClassResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: ClassResponseDto })
  data: ClassResponseDto;

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class ClassDetailResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: ClassDetailResponseDto })
  data: ClassDetailResponseDto;

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class ClassListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [ClassResponseDto] })
  data: ClassResponseDto[];

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class TransferClassStudentsResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: TransferClassStudentsResponseDto })
  data: TransferClassStudentsResponseDto;

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
