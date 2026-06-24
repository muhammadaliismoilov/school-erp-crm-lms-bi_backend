import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { CommunicationSentiment, ParentType } from '../entities/parent-communication.entity';

export class CreateParentCommDto {
  @ApiProperty({ format: 'uuid', description: 'O‘quvchi IDsi.' })
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID formatida bo‘lishi kerak' })
  studentId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf (guruh) IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi UUID formatida bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Ota-ona (users) IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Ota-ona IDsi UUID formatida bo‘lishi kerak' })
  parentId?: string;

  @ApiProperty({ enum: ParentType, example: ParentType.MOTHER, description: 'Ota-ona turi.' })
  @IsEnum(ParentType, { message: 'Ota-ona turi mother, father, guardian yoki other bo‘lishi kerak' })
  parentType: ParentType;

  @ApiProperty({ enum: CommunicationSentiment, example: CommunicationSentiment.POSITIVE, description: 'Ota-ona munosabati.' })
  @IsEnum(CommunicationSentiment, { message: 'Munosabat positive, neutral yoki negative bo‘lishi kerak' })
  sentiment: CommunicationSentiment;

  @ApiPropertyOptional({ format: 'uuid', description: 'Tyutor (users) IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Tyutor IDsi UUID formatida bo‘lishi kerak' })
  tutorId?: string;

  @ApiPropertyOptional({ example: 80, minimum: 0, maximum: 100, description: 'Ta’lim bali.', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Ta’lim bali butun son bo‘lishi kerak' })
  @Min(0, { message: 'Ta’lim bali 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Ta’lim bali 100 dan oshmasligi kerak' })
  educationScore?: number;

  @ApiPropertyOptional({ example: 75, minimum: 0, maximum: 100, description: 'Sinf yetakchisi bali.', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sinf yetakchisi bali butun son bo‘lishi kerak' })
  @Min(0, { message: 'Sinf yetakchisi bali 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Sinf yetakchisi bali 100 dan oshmasligi kerak' })
  classLeaderScore?: number;

  @ApiPropertyOptional({ example: 40, minimum: 0, maximum: 100, description: 'Darsdan tashqari ball.', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Darsdan tashqari ball butun son bo‘lishi kerak' })
  @Min(0, { message: 'Darsdan tashqari ball 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Darsdan tashqari ball 100 dan oshmasligi kerak' })
  extracurricularScore?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0, maximum: 100, description: 'Tashkiliy ball.', nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tashkiliy ball butun son bo‘lishi kerak' })
  @Min(0, { message: 'Tashkiliy ball 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Tashkiliy ball 100 dan oshmasligi kerak' })
  organizationalScore?: number;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Maqsad.', nullable: true })
  @IsOptional()
  @IsString({ message: 'Maqsad matn bo‘lishi kerak' })
  @Length(0, 2000, { message: 'Maqsad 2000 belgidan oshmasligi kerak' })
  purpose?: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Izohlar.', nullable: true })
  @IsOptional()
  @IsString({ message: 'Izoh matn bo‘lishi kerak' })
  @Length(0, 2000, { message: 'Izoh 2000 belgidan oshmasligi kerak' })
  notes?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Muloqot sanasi (default: hozir).', nullable: true })
  @IsOptional()
  @IsISO8601({}, { message: 'Muloqot sanasi ISO-8601 formatida bo‘lishi kerak' })
  communicationDate?: string;
}
