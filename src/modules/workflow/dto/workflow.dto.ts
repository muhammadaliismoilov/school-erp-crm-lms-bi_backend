import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApprovalPriority, ApprovalStatus } from '../enums/workflow.enums';

export class CreateApprovalRequestDto {
  @ApiProperty() @IsString() @Length(2, 100) entityType: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() entityId: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() requestedById?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() approverId?: string;
  @ApiProperty() @IsString() @Length(3, 220) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ApprovalPriority }) @IsOptional() @IsEnum(ApprovalPriority) priority?: ApprovalPriority;
}
export class DecideApprovalRequestDto {
  @ApiProperty({ enum: ApprovalStatus }) @IsEnum(ApprovalStatus) status: ApprovalStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() decisionComment?: string;
}
