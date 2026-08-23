import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Foydalanuvchini boshqa maktab/filialga ko'chirish
 * (`PATCH /users/:id/school`). `users.update`dan ATAYLAB ajratilgan: bu —
 * tenant chegarasini kesib o'tuvchi yagona amal, shuning uchun faqat
 * super-admin uchun (`users.reassign-school`, `CONFIDENTIAL_PERMISSION_CODES`).
 */
export class ReassignSchoolDto {
  @ApiProperty({ description: 'Yangi maktab IDsi.', format: 'uuid' })
  @IsUUID('4', { message: 'Maktab IDsi UUID formatida bo‘lishi kerak' })
  schoolId: string;

  @ApiPropertyOptional({ description: 'Yangi filial IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Filial IDsi UUID formatida bo‘lishi kerak' })
  branchId?: string;
}
