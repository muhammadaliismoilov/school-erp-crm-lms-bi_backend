import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonStatus } from '../../../common/enums/common-status.enum';

export class CourseQuarterBriefDto {
  @ApiProperty({ example: '5c617a45-57a4-4864-89c8-96e299173908', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 4 })
  quarterNumber: number;

  @ApiProperty({ example: '4-chorak' })
  name: string;

  @ApiProperty({ example: '2026-03-26', format: 'date' })
  startDate: string;

  @ApiProperty({ example: '2026-06-15', format: 'date' })
  endDate: string;
}

export class CourseRoomBriefDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '102' })
  roomNumber: string;

  @ApiProperty({ example: 1 })
  floor: number;

  @ApiProperty({ example: '1-qavat 102' })
  label: string;
}

export class CourseSubjectBriefDto {
  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Matematika' })
  name: string;

  @ApiProperty({ example: '#2563EB' })
  color: string;
}

export class CourseTeacherBriefDto {
  @ApiProperty({ example: '42f35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Farrux Xolmatov' })
  fullName: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  phone?: string | null;
}

export class CourseStatsDto {
  @ApiProperty({ example: 24, minimum: 0 })
  plannedLessonCount: number;

  @ApiProperty({ example: 0, minimum: 0 })
  completedLessonCount: number;

  @ApiProperty({ example: 3, minimum: 0 })
  studentCount: number;

  @ApiPropertyOptional({ example: null, nullable: true, minimum: 0, maximum: 5 })
  averageGrade?: number | null;
}

export class CourseStudentRowDto {
  @ApiProperty({ example: '77f35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Aliyev Aziz' })
  fullName: string;

  @ApiPropertyOptional({ example: 'S-1' })
  studentCode?: string | null;

  @ApiPropertyOptional({ example: 'male' })
  gender?: string | null;

  @ApiPropertyOptional({ example: '2-A' })
  className?: string | null;
}

export class CourseResponseDto {
  @ApiProperty({ example: '6c617a45-57a4-4864-89c8-96e299173908', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'IT' })
  name: string;

  @ApiProperty({ type: CourseQuarterBriefDto })
  quarter: CourseQuarterBriefDto;

  @ApiProperty({ example: '2026-03-26', format: 'date' })
  startDate: string;

  @ApiProperty({ example: '2026-06-15', format: 'date' })
  endDate: string;

  @ApiProperty({ type: CourseRoomBriefDto })
  room: CourseRoomBriefDto;

  @ApiPropertyOptional({ example: 'Frontend kursi', nullable: true })
  description?: string | null;

  @ApiProperty({ type: CourseSubjectBriefDto })
  subject: CourseSubjectBriefDto;

  @ApiProperty({ type: CourseTeacherBriefDto })
  teacher: CourseTeacherBriefDto;

  @ApiProperty({ type: CourseStatsDto })
  stats: CourseStatsDto;

  @ApiProperty({ enum: CommonStatus, example: CommonStatus.ACTIVE })
  status: CommonStatus;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class CourseDetailResponseDto extends CourseResponseDto {
  @ApiProperty({ type: [CourseStudentRowDto] })
  students: CourseStudentRowDto[];
}

export class CourseListStatsDto {
  @ApiProperty({ example: 1 })
  totalCourses: number;

  @ApiProperty({ example: 0 })
  totalStudents: number;

  @ApiProperty({ example: 1 })
  totalTeachers: number;

  @ApiProperty({ example: 0 })
  plannedLessons: number;

  @ApiProperty({ example: 0 })
  completedLessons: number;
}

export class CourseListResponseDto {
  @ApiProperty({ type: [CourseResponseDto] })
  items: CourseResponseDto[];

  @ApiProperty({ type: CourseListStatsDto })
  stats: CourseListStatsDto;

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 12 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class CourseResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: CourseResponseDto })
  data: CourseResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class CourseDetailResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: CourseDetailResponseDto })
  data: CourseDetailResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class CourseListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: CourseListResponseDto })
  data: CourseListResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class CourseStudentListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [CourseStudentRowDto] })
  data: CourseStudentRowDto[];

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
