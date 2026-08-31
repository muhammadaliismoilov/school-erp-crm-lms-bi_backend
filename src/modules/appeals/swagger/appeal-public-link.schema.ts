import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppealPublicLinkSchema {
  @ApiPropertyOptional({
    example: 'a1b2c3d4e5f6',
    nullable: true,
    description: 'Faol public havola tokeni. Havola hali yaratilmagan bo‘lsa null.',
  })
  token: string | null;

  @ApiPropertyOptional({
    example: 'http://localhost:3001/p/appeals/a1b2c3d4e5f6',
    nullable: true,
    description: 'To‘liq ulashish uchun URL manzil.',
  })
  url: string | null;

  @ApiProperty({ example: true, description: 'Faol havola mavjudligini bildiradi.' })
  active: boolean;
}

/** Public (auth talab qilmaydigan) havola tekshiruvi javobi. */
export class PublicAppealLinkInfoSchema {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: 'Maktab murojaatlari', description: 'Public forma sarlavhasi.' })
  title: string;

  @ApiPropertyOptional({
    example: 'Elegant School',
    nullable: true,
    description:
      'Havola tegishli maktab nomi. Ota-ona qaysi maktabga yozayotganini ko‘rishi uchun — ' +
      'bir nechta maktabli tarmoqda bu ishonchning asosi.',
  })
  schoolName: string | null;
}
