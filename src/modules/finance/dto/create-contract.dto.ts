import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { ContractStatus } from '../enums/contract-status.enum';

export class CreateContractDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  contractTypeId: string;

  @ApiProperty({ example: '2026-06-07', format: 'date' })
  @IsISO8601({ strict: true })
  issueDate: string;

  @ApiProperty({ example: 15000000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount: number;

  @ApiPropertyOptional({ enum: ContractStatus, example: ContractStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
