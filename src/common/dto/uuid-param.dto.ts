import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UuidParamDto {
  @ApiProperty({
    description: 'Resource identifier in UUID format',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
    format: 'uuid',
  })
  @IsUUID()
  id: string;
}
