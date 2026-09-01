import { ApiProperty } from '@nestjs/swagger';

export class DbHealthResponseSchema {
  @ApiProperty({
    enum: ['ok', 'busy', 'critical'],
    example: 'busy',
    description: 'Chiroq rangi: yashil / sariq / qizil.',
  })
  level: 'ok' | 'busy' | 'critical';

  @ApiProperty({
    isArray: true,
    enum: ['pool_waiting', 'slow_queries', 'query_errors'],
    example: ['slow_queries'],
    description: 'Darajani ko‘targan signallar — panel shuni matn qilib ko‘rsatadi.',
  })
  signals: ('pool_waiting' | 'slow_queries' | 'query_errors')[];

  @ApiProperty({ example: 3, description: 'Ulanish kutayotgan so‘rovlar (pool navbati).' })
  waiting: number;

  @ApiProperty({ example: 12, description: 'Sekin so‘rovlar, daqiqasiga.' })
  slowPerMinute: number;

  @ApiProperty({ example: 0, description: 'DB xatolari, daqiqasiga.' })
  errorsPerMinute: number;

  @ApiProperty({
    example: false,
    description:
      'Ilova hali isinmoqda. Sovuq startdan keyingi birinchi soniyalarda daraja ' +
      'ataylab `ok` — Render Free tier‘da uyg‘onish so‘rovi sekundlarga cho‘ziladi.',
  })
  warmingUp: boolean;
}
