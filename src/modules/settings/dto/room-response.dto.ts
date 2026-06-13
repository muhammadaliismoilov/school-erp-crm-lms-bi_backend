import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomResponseDto {
  @ApiProperty({
    example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Unique room number/code shown on the room card.',
    example: '101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'Numeric floor value.',
    example: 1,
    minimum: 1,
    maximum: 100,
  })
  floor: number;

  @ApiProperty({
    description: 'Floor label shown by settings UI cards.',
    example: '1-Qavat',
  })
  floorLabel: string;

  @ApiPropertyOptional({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class RoomResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: RoomResponseDto })
  data: RoomResponseDto;

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class RoomListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [RoomResponseDto] })
  data: RoomResponseDto[];

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
