import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveSchoolResponseDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  schoolId: string;

  @ApiProperty({ example: 'Elegant School' })
  schoolName: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.uz/logo.png', nullable: true })
  logoUrl?: string | null;
}

export class ResolveSchoolResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: ResolveSchoolResponseDto })
  data: ResolveSchoolResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
