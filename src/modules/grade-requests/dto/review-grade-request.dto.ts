import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { GradeRequestStatus } from '../entities/grade-change-request.entity';

/** So'rovni ko'rib chiqish: faqat tasdiqlash yoki rad etish. */
export class ReviewGradeRequestDto {
  @ApiProperty({
    enum: [GradeRequestStatus.APPROVED, GradeRequestStatus.REJECTED],
    example: GradeRequestStatus.APPROVED,
    description: 'Yangi holat: approved yoki rejected.',
  })
  @IsEnum(GradeRequestStatus, { message: 'Holat approved yoki rejected bo‘lishi kerak' })
  status: GradeRequestStatus;

  @ApiPropertyOptional({
    example: 'So‘rov asoslangan, baho yangilandi.',
    maxLength: 2000,
    description: 'Ko‘rib chiqish izohi. Rad etishda majburiy.',
  })
  @IsOptional()
  @IsString({ message: 'Izoh matn bo‘lishi kerak' })
  @Length(3, 2000, { message: 'Izoh 3 dan 2000 belgigacha bo‘lishi kerak' })
  reviewNote?: string;
}
