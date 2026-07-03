import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Bitta turniket o'tish hodisasi (qurilma yuboradigan). */
export class TurnstileEventDto {
  /**
   * Shaxsni aniqlovchi kod — TurnstileAssignment dagi entry_code/exit_code bilan
   * mos keladi (FaceID identifikatori yoki karta raqami).
   */
  @ApiProperty({ example: 'FACE-000123' })
  @IsString()
  @Length(1, 120)
  code: string;

  @ApiProperty({ enum: ['in', 'out'], example: 'in' })
  @IsIn(['in', 'out'])
  direction: 'in' | 'out';

  /** Hodisa qurilmada ro'y bergan vaqt (ISO-8601, oflayn buferdan kechikishi mumkin). */
  @ApiProperty({ example: '2026-07-03T08:35:00.000Z', format: 'date-time' })
  @IsISO8601({ strict: true })
  capturedAt: string;

  /**
   * Qurilma bergan takror-himoya kaliti (ixtiyoriy). Berilmasa server
   * `device:code:direction:capturedAt` dan hosil qiladi.
   */
  @ApiPropertyOptional({ example: 'dev1-993201' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  eventId?: string;

  @ApiPropertyOptional({ example: 98.5, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  faceMatchConfidence?: number;

  @ApiPropertyOptional({ description: 'Qurilma xom yuki (audit uchun).' })
  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}

/** Bir yoki bir nechta hodisani (batch) yuborish. */
export class IngestTurnstileEventsDto {
  @ApiProperty({ type: [TurnstileEventDto], minItems: 1, maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TurnstileEventDto)
  events: TurnstileEventDto[];
}
