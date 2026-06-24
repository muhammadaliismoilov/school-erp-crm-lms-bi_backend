import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationSentiment, ParentType } from '../entities/parent-communication.entity';

export class ParentCommResponseSchema {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiPropertyOptional({ nullable: true, description: 'O‘quvchining to‘liq ismi.' })
  studentName?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Sinf nomi (masalan 2-A).' })
  className?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Ota-ona to‘liq ismi.' })
  parentName?: string | null;

  @ApiProperty({ enum: ParentType })
  parentType: ParentType;

  @ApiProperty({ enum: CommunicationSentiment })
  sentiment: CommunicationSentiment;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  tutorId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  tutorName?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdById?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Muloqotni qayd qilgan xodim (XODIM).' })
  staffName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  educationScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  classLeaderScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  extracurricularScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  organizationalScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  purpose?: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  @ApiProperty({ format: 'date-time' })
  communicationDate: Date;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty()
  version: number;
}

export class ParentCommStatsSchema {
  @ApiProperty({ description: 'Jami muloqotlar.' })
  totalCount: number;

  @ApiProperty({ description: 'Ijobiy.' })
  positiveCount: number;

  @ApiProperty({ description: 'Neytral.' })
  neutralCount: number;

  @ApiProperty({ description: 'Salbiy.' })
  negativeCount: number;
}

export class ParentCommPageMetaSchema {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() pageCount: number;
}

export class ParentCommListResponseSchema {
  @ApiProperty({ type: [ParentCommResponseSchema] })
  items: ParentCommResponseSchema[];

  @ApiProperty({ type: ParentCommPageMetaSchema })
  meta: ParentCommPageMetaSchema;

  @ApiProperty({ type: ParentCommStatsSchema })
  stats: ParentCommStatsSchema;
}
