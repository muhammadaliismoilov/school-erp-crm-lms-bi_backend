import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class LinkParentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  parentId: string;

  @ApiProperty({ example: 'father', minLength: 2, maxLength: 40 })
  @IsString()
  @Length(2, 40)
  relation: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
