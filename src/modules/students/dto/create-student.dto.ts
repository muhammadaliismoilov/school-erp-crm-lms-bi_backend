import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Gender, StudentStatus } from '../enums/student-status.enum';

export class CreateStudentDto {
  @ApiProperty({ example: 'Ali', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiProperty({ example: 'Valiyev', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  lastName: string;

  @ApiPropertyOptional({ example: '2015-03-20', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: true })
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: 'ST-2026-0001', minLength: 3, maxLength: 40 })
  @IsString()
  @Length(3, 40)
  @Matches(/^[A-Z0-9-]+$/)
  studentCode: string;

  @ApiPropertyOptional({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ example: '12345678901234', minLength: 1, maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nationalId?: string;
}
