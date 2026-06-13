import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, IsUUID, Length } from 'class-validator';
import { LeadStatus } from '../enums/lead-status.enum';

export class CreateLeadDto {
  @ApiProperty({ example: 'Ali', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiPropertyOptional({ example: 'Valiyev', minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiProperty({ example: '+998901234567' })
  @IsPhoneNumber('UZ')
  phone: string;

  @ApiPropertyOptional({ example: 'parent@example.com', format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: LeadStatus, example: LeadStatus.NEW })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'Interested in grade 5 admission', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;

  @ApiPropertyOptional({ example: 'REF-2026', minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  referralCode?: string;
}
