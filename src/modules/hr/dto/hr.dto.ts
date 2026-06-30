import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsISO8601, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { EmploymentStatus, LeaveStatus, LeaveType, PayrollStatus, QualificationCategory, StaffAchievementCategory, StaffAchievementIcon, StaffAchievementRank } from '../enums/hr.enums';
import { DepartmentStatus } from '../entities/department.entity';
import { PositionStatus } from '../entities/position.entity';
import { UserGender } from '../../users/enums/user.enums';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Academic' }) @IsString() @Length(2, 80) name: string;
  @ApiPropertyOptional({ example: 'academic', description: 'Yuborilmasa nomdan avtomatik generatsiya qilinadi.' })
  @IsOptional() @IsString() @Length(2, 40) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 1000) description?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Asosiy maktab (bosh ofis) IDsi.' })
  @IsOptional() @IsUUID() schoolId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Filial (branch) IDsi.' })
  @IsOptional() @IsUUID() filialId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Ota bo‘lim IDsi.' })
  @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional({ description: 'Telegram chat ID.' })
  @IsOptional() @IsString() @Length(1, 64) telegramChatId?: string;
  @ApiPropertyOptional({ enum: DepartmentStatus })
  @IsOptional() @IsEnum(DepartmentStatus) status?: DepartmentStatus;
}
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class CreateBranchDto {
  @ApiProperty({ example: 'Yangibozor filiali' }) @IsString() @Length(1, 180) name: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Ota filial IDsi.' })
  @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Maktab IDsi (ixtiyoriy).' })
  @IsOptional() @IsUUID() schoolId?: string;
  @ApiPropertyOptional({ description: 'Bosh ofis hisoblanadimi.' })
  @IsOptional() @IsBoolean() isHeadOffice?: boolean;
  @ApiPropertyOptional({ description: 'Faol holati.' })
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateBranchDto extends PartialType(CreateBranchDto) {}

export class BranchQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Nom bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;
}

export class DepartmentQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Nom bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filial bo‘yicha filter.' })
  @IsOptional() @IsUUID() filialId?: string;

  @ApiPropertyOptional({ enum: DepartmentStatus })
  @IsOptional() @IsEnum(DepartmentStatus) status?: DepartmentStatus;
}

export class CreatePositionDto {
  @ApiProperty({ example: 'Math teacher' }) @IsString() @Length(1, 80) title: string;
  @ApiPropertyOptional({ example: 'math_teacher', description: 'Yuborilmasa nomdan avtomatik generatsiya qilinadi.' })
  @IsOptional() @IsString() @Length(2, 40) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 1000) description?: string;
  @ApiPropertyOptional({ example: 5000000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) baseSalary?: number;
  @ApiPropertyOptional({ format: 'uuid', description: 'Bo‘lim IDsi.' })
  @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Asosiy maktab (bosh ofis) IDsi.' })
  @IsOptional() @IsUUID() schoolId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Filial (branch) IDsi.' })
  @IsOptional() @IsUUID() filialId?: string;
  @ApiPropertyOptional({ enum: PositionStatus })
  @IsOptional() @IsEnum(PositionStatus) status?: PositionStatus;
}
export class UpdatePositionDto extends PartialType(CreatePositionDto) {}

export class PositionQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Nom bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() filialId?: string;
  @ApiPropertyOptional({ enum: PositionStatus }) @IsOptional() @IsEnum(PositionStatus) status?: PositionStatus;
}

export class CreateStaffMemberDto {
  @ApiPropertyOptional({ example: 'EMP-001', description: 'Yuborilmasa avtomatik generatsiya qilinadi.' })
  @IsOptional() @IsString() @Length(2, 40) employeeCode?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() userId?: string;

  @ApiProperty({ example: 'Ali' }) @IsString() @Length(1, 80) firstName: string;
  @ApiPropertyOptional({ example: 'Али' }) @IsOptional() @IsString() @Length(1, 80) firstNameCyrillic?: string;
  @ApiProperty({ example: 'Valiyev' }) @IsString() @Length(1, 80) lastName: string;
  @ApiPropertyOptional({ example: 'Валиев' }) @IsOptional() @IsString() @Length(1, 80) lastNameCyrillic?: string;
  @ApiPropertyOptional({ example: 'Akmalovich' }) @IsOptional() @IsString() @Length(1, 80) middleName?: string;
  @ApiPropertyOptional({ example: 'Акмалович' }) @IsOptional() @IsString() @Length(1, 80) middleNameCyrillic?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @Length(5, 20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: UserGender }) @IsOptional() @IsEnum(UserGender) gender?: UserGender;
  @ApiPropertyOptional({ example: '2000-01-15', format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) birthDate?: string;
  @ApiPropertyOptional({ example: 'AB1234567' }) @IsOptional() @IsString() @Length(1, 32) passportSeries?: string;
  @ApiPropertyOptional({ example: '12345678901234' }) @IsOptional() @IsString() @Length(14, 14) pinfl?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() positionId?: string;
  @ApiProperty({ example: '2026-09-01', format: 'date' }) @IsISO8601({ strict: true }) hireDate: string;
  @ApiPropertyOptional({ enum: EmploymentStatus }) @IsOptional() @IsEnum(EmploymentStatus) status?: EmploymentStatus;
  @ApiPropertyOptional({ example: 5000000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salary?: number;

  /** O'qituvchining malaka toifasi (mutaxassis/ikkinchi/birinchi/oliy). */
  @ApiPropertyOptional({ enum: QualificationCategory, description: 'O‘qituvchining malaka toifasi.' })
  @IsOptional() @IsEnum(QualificationCategory) qualificationCategory?: QualificationCategory;
  @ApiPropertyOptional({ example: '2025-06-01', format: 'date', description: 'Toifa berilgan sana (attestatsiya).' })
  @IsOptional() @IsISO8601({ strict: true }) qualificationDate?: string;

  /** Login user uchun tizim roli nomi (masalan 'accountant'). Tanlanmasa user rolsiz yaratiladi. */
  @ApiPropertyOptional({ example: 'accountant', description: 'Login user uchun tizim roli nomi.' })
  @IsOptional() @IsString() @Length(1, 80) roleName?: string;

  /** Maoshni o'zgartirish/yangilashda tarixga yoziladigan sabab. */
  @ApiPropertyOptional({ description: 'Maosh o‘zgarishi sababi (tarix uchun).' })
  @IsOptional() @IsString() @Length(1, 500) salaryChangeReason?: string;
}
export class UpdateStaffMemberDto extends PartialType(CreateStaffMemberDto) {}

// ─── Sertifikatlar ──────────────────────────────────────────────────────────

export class CreateStaffCertificateDto {
  @ApiProperty({ example: 'IELTS 7.0' }) @IsString() @Length(1, 200) name: string;
  @ApiPropertyOptional({ example: '2027-06-01', format: 'date', description: 'Amal qilish muddati (tugash sanasi).' })
  @IsOptional() @IsISO8601({ strict: true }) expiresAt?: string;
}
export class UpdateStaffCertificateDto extends PartialType(CreateStaffCertificateDto) {}

// ─── Yutuqlar ───────────────────────────────────────────────────────────────

export class CreateStaffAchievementDto {
  @ApiProperty({ example: 'Eng yaxshi o‘qituvchi 2025' }) @IsString() @Length(1, 200) title: string;
  @ApiPropertyOptional({ enum: StaffAchievementCategory }) @IsOptional() @IsEnum(StaffAchievementCategory) category?: StaffAchievementCategory;
  @ApiPropertyOptional({ enum: StaffAchievementRank }) @IsOptional() @IsEnum(StaffAchievementRank) rank?: StaffAchievementRank;
  @ApiPropertyOptional({ enum: StaffAchievementIcon }) @IsOptional() @IsEnum(StaffAchievementIcon) icon?: StaffAchievementIcon;
  @ApiPropertyOptional({ example: '2025-05-20', format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) achievedAt?: string;
  @ApiPropertyOptional({ example: 'Xalq ta‘limi vazirligi' }) @IsOptional() @IsString() @Length(1, 200) organization?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @ApiPropertyOptional({ description: 'Sertifikat/diplom havolasi.' }) @IsOptional() @IsString() @Length(1, 2000) certificateUrl?: string;
}
export class UpdateStaffAchievementDto extends PartialType(CreateStaffAchievementDto) {}

export class StaffQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Ism, email yoki telefon bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional() @IsEnum(EmploymentStatus) status?: EmploymentStatus;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() positionId?: string;
}

export class CreateLeaveDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiProperty({ enum: LeaveType }) @IsEnum(LeaveType) type: LeaveType;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) startDate: string;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) endDate: string;
  @ApiProperty({ example: 5, minimum: 0 }) @Type(() => Number) @IsInt() @Min(0) @Max(365) days: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) reason?: string;
  @ApiPropertyOptional({ enum: LeaveStatus }) @IsOptional() @IsEnum(LeaveStatus) status?: LeaveStatus;
}
export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}

export class LeaveQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Xodim ismi bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ enum: LeaveStatus }) @IsOptional() @IsEnum(LeaveStatus) status?: LeaveStatus;
  @ApiPropertyOptional({ enum: LeaveType }) @IsOptional() @IsEnum(LeaveType) type?: LeaveType;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() staffMemberId?: string;
}

export class ReviewLeaveDto {
  @ApiProperty({ enum: [LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED] })
  @IsEnum(LeaveStatus) status: LeaveStatus;
}

export class CreatePayrollDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiProperty({ example: '2026-06' }) @Matches(/^\d{4}-\d{2}$/) period: string;
  @ApiProperty({ example: 5000000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() baseAmount: number;
  @ApiPropertyOptional({ example: 500000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) bonus?: number;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) deduction?: number;
  @ApiPropertyOptional({ enum: PayrollStatus }) @IsOptional() @IsEnum(PayrollStatus) status?: PayrollStatus;
}
export class UpdatePayrollDto extends PartialType(CreatePayrollDto) {}
