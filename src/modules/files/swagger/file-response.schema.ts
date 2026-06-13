import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileResponseSchema {
  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'avatar.png' })
  fileName: string;

  @ApiProperty({ example: 'image/png' })
  mimeType: string;

  @ApiProperty({ example: 24576, description: 'Fayl hajmi baytlarda.' })
  size: number;

  @ApiPropertyOptional({
    example: 'http://localhost:9000/yuton-files/uploads/2026-06-12/uuid-avatar.png',
    nullable: true,
    description: 'Fayl ommaviy URL manzili (storage public base URL sozlangan bo‘lsa).',
  })
  url?: string | null;

  @ApiPropertyOptional({ example: '2026-06-12T20:40:00.000Z', format: 'date-time' })
  createdAt?: string;
}
