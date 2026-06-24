import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradeRequestKind, GradeRequestStatus } from '../entities/grade-change-request.entity';

export class GradeRequestResponseSchema {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: GradeRequestKind })
  kind: GradeRequestKind;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiPropertyOptional({ nullable: true, description: 'O‘quvchining to‘liq ismi (denormalizatsiya).' })
  studentName?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  subjectId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Fan nomi (denormalizatsiya).' })
  subjectName?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  quarterId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  targetEntityId?: string | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  currentGrade?: number | null;

  @ApiProperty({ example: 5 })
  requestedGrade: number;

  @ApiProperty({ example: 'Imtihon qayta tekshirildi.' })
  reason: string;

  @ApiProperty({ enum: GradeRequestStatus })
  status: GradeRequestStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  requestedById?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  reviewedById?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  reviewedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  reviewNote?: string | null;

  @ApiProperty()
  applied: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty()
  version: number;
}

export class GradeRequestStatsSchema {
  @ApiProperty({ description: 'Jami so‘rovlar (joriy tab bo‘yicha).' })
  totalCount: number;

  @ApiProperty({ description: 'Kutilmoqda.' })
  pendingCount: number;

  @ApiProperty({ description: 'Tasdiqlangan.' })
  approvedCount: number;

  @ApiProperty({ description: 'Rad etilgan.' })
  rejectedCount: number;
}

export class GradeRequestPageMetaSchema {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() pageCount: number;
}

export class GradeRequestListResponseSchema {
  @ApiProperty({ type: [GradeRequestResponseSchema] })
  items: GradeRequestResponseSchema[];

  @ApiProperty({ type: GradeRequestPageMetaSchema })
  meta: GradeRequestPageMetaSchema;

  @ApiProperty({ type: GradeRequestStatsSchema })
  stats: GradeRequestStatsSchema;
}
