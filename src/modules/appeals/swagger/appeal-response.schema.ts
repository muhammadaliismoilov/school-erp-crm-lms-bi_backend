import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppealSource, AppealStatus, AppealType, TargetRole } from '../entities/appeal.entity';

export class AppealResponseSchema {
  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ali Valiyev', description: 'Murojaat qiluvchi to‘liq ismi.' })
  fullName: string;

  @ApiProperty({ example: '+998901234567', description: 'Murojaat qiluvchi telefon raqami.' })
  phone: string;

  @ApiProperty({ enum: AppealType, example: AppealType.SUGGESTION, description: 'Murojaat turi.' })
  type: AppealType;

  @ApiProperty({ enum: TargetRole, example: TargetRole.CLASS_TEACHER, description: 'Maqsad lavozim.' })
  targetRole: TargetRole;

  @ApiProperty({ example: 'Matematika xonasidagi partalarni yangilash kerak.', description: 'Murojaat mazmuni.' })
  description: string;

  @ApiProperty({ enum: AppealSource, example: AppealSource.PUBLIC_LINK, description: 'Murojaat manbasi.' })
  source: AppealSource;

  @ApiProperty({ enum: AppealStatus, example: AppealStatus.PENDING, description: 'Murojaat holati.' })
  status: AppealStatus;

  @ApiProperty({ example: '2026-06-09T10:00:00.000Z', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-09T10:00:00.000Z', format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: 1 })
  version: number;
}

export class AppealPageMetaSchema {
  @ApiProperty({ example: 1, description: 'Joriy sahifa raqami.' })
  page: number;

  @ApiProperty({ example: 20, description: 'Har bir sahifadagi elementlar soni.' })
  limit: number;

  @ApiProperty({ example: 50, description: 'Umumiy topilgan elementlar soni.' })
  total: number;

  @ApiProperty({ example: 3, description: 'Jami sahifalar soni.' })
  pageCount: number;
}

export class AppealStatsSchema {
  @ApiProperty({ example: 10, description: 'Barcha murojaatlar soni.' })
  totalCount: number;

  @ApiProperty({ example: 6, description: 'Takliflar soni.' })
  suggestionCount: number;

  @ApiProperty({ example: 4, description: 'Shikoyatlar soni.' })
  complaintCount: number;

  @ApiProperty({ example: 2, description: 'Joriy oyda kelgan murojaatlar soni.' })
  monthCount: number;
}

export class AppealListResponseSchema {
  @ApiProperty({ type: [AppealResponseSchema] })
  items: AppealResponseSchema[];

  @ApiProperty({ type: AppealPageMetaSchema })
  meta: AppealPageMetaSchema;

  @ApiProperty({ type: AppealStatsSchema })
  stats: AppealStatsSchema;
}
