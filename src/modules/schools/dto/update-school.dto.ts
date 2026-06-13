import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { CreateSchoolDto } from './create-school.dto';

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @ApiPropertyOptional({ description: 'Maktab holati.', enum: CommonStatus, example: CommonStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;
}
