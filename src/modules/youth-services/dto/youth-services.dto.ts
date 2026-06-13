import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { MealType, ServiceRequestStatus } from '../enums/youth-services.enums';

export class CreateMealMenuDto {
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) menuDate: string;
  @ApiProperty({ enum: MealType }) @IsEnum(MealType) mealType: MealType;
  @ApiProperty() @IsString() @Length(2, 160) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) calories?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() allergens?: string[];
}
export class UpdateMealMenuDto extends PartialType(CreateMealMenuDto) {}
export class CreateYouthServiceRequestDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() studentId?: string;
  @ApiProperty() @IsString() @Length(2, 100) category: string;
  @ApiProperty() @IsString() @Length(2, 160) title: string;
  @ApiProperty() @IsString() @Length(3, 3000) description: string;
  @ApiPropertyOptional({ enum: ServiceRequestStatus }) @IsOptional() @IsEnum(ServiceRequestStatus) status?: ServiceRequestStatus;
}
export class UpdateYouthServiceRequestDto extends PartialType(CreateYouthServiceRequestDto) {}
