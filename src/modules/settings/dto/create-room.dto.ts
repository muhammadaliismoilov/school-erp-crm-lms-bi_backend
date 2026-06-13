import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

const roomNumberPattern = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,31}$/;

const trimRoomNumber = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateRoomDto {
  @ApiProperty({
    description: 'Building floor where the room is located. UI renders it as "1-Qavat".',
    example: 1,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  floor: number;

  @ApiProperty({
    description:
      'Unique room number/code. Allowed characters: Latin letters, digits, spaces, dot, underscore, slash, and hyphen.',
    example: '101',
    minLength: 1,
    maxLength: 32,
    pattern: '^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,31}$',
  })
  @Transform(({ value }) => trimRoomNumber(value))
  @IsString()
  @Length(1, 32)
  @Matches(roomNumberPattern)
  roomNumber: string;
}
