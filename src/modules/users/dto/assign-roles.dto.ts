import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ type: [String], example: ['teacher'], maxItems: 20 })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  roleNames: string[];
}
