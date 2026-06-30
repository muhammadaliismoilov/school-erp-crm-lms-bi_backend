import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
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
import {
  TeacherCategory,
  TeacherDegree,
  TeacherEmploymentType,
  TeacherStatus,
  TeacherWorkType,
} from '../enums/hr.enums';
import { UserGender } from '../../users/enums/user.enums';

export class CreateTeacherDto {
  @ApiProperty({ example: 'Aziz' }) @IsString() @Length(1, 80) firstName: string;
  @ApiProperty({ example: 'Karimov' }) @IsString() @Length(1, 80) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 80) middleName?: string;
  @ApiPropertyOptional({ enum: UserGender }) @IsOptional() @IsEnum(UserGender) gender?: UserGender;
  @ApiPropertyOptional({ example: '1990-05-12' }) @IsOptional() @IsISO8601() birthDate?: string;

  @ApiPropertyOptional({ description: 'Hujjat (passport) raqami.' })
  @IsOptional() @IsString() @Length(1, 32) documentNumber?: string;
  @ApiPropertyOptional({ description: 'JSHSHIR (PINFL) — 14 raqam.' })
  @IsOptional() @Matches(/^\d{14}$/, { message: 'pinfl 14 ta raqamdan iborat bo‘lishi kerak' }) pinfl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Bog‘langan xodim IDsi.' })
  @IsOptional() @IsUUID() staffMemberId?: string;

  @ApiPropertyOptional({ enum: TeacherWorkType, default: TeacherWorkType.FULL })
  @IsOptional() @IsEnum(TeacherWorkType) workType?: TeacherWorkType;
  @ApiPropertyOptional({ enum: TeacherDegree })
  @IsOptional() @IsEnum(TeacherDegree) degree?: TeacherDegree;
  @ApiPropertyOptional({ enum: TeacherEmploymentType, default: TeacherEmploymentType.PRIMARY })
  @IsOptional() @IsEnum(TeacherEmploymentType) employmentType?: TeacherEmploymentType;
  @ApiPropertyOptional({ enum: TeacherStatus, default: TeacherStatus.ACTIVE })
  @IsOptional() @IsEnum(TeacherStatus) status?: TeacherStatus;
  @ApiPropertyOptional({ enum: TeacherCategory })
  @IsOptional() @IsEnum(TeacherCategory) category?: TeacherCategory;

  @ApiPropertyOptional({ minimum: 0, maximum: 80, description: 'Ish staji (yil).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(80) experienceYears?: number;
  @ApiPropertyOptional({ minimum: 0, description: 'Dars uchun stavka.' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ratePerLesson?: number;

  @ApiPropertyOptional({ example: '2020-09-01' }) @IsOptional() @IsISO8601() startDate?: string;
  @ApiPropertyOptional({ example: '2025-06-30' }) @IsOptional() @IsISO8601() endDate?: string;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isSubjectTeacher?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isAssistantTeacher?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isMbr?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isExtraLesson?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isClassLeader?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) note?: string;
}

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}

export class TeacherQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Ism/familiya/telefon bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ enum: TeacherCategory })
  @IsOptional() @IsEnum(TeacherCategory) category?: TeacherCategory;

  @ApiPropertyOptional({ enum: TeacherWorkType })
  @IsOptional() @IsEnum(TeacherWorkType) workType?: TeacherWorkType;

  @ApiPropertyOptional({ enum: TeacherStatus })
  @IsOptional() @IsEnum(TeacherStatus) status?: TeacherStatus;
}
