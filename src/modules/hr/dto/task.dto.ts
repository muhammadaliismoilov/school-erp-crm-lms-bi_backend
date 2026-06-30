import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { TaskPriority, TaskStatus } from '../enums/hr.enums';

export class CreateTaskDto {
  @ApiProperty({ example: 'Hujjatlarni tayyorlash' }) @IsString() @Length(1, 200) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Loyiha IDsi.' })
  @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Ijrochi (xodim) IDsi.' })
  @IsOptional() @IsUUID() assigneeId?: string;
  @ApiPropertyOptional({ enum: TaskStatus }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) startDate?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) endDate?: string;
}
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class TaskQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Sarlavha bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ enum: TaskStatus }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() assigneeId?: string;
}

/** Loyiha yaratish (minimal — Loyihalar feature'i kengaytiradi). */
export class CreateProjectDto {
  @ApiProperty({ example: 'Yangi loyiha' }) @IsString() @Length(1, 160) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;
}
