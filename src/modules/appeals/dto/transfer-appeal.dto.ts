import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Murojaatni boshqa maktabga ko'chirish. */
export class TransferAppealDto {
  @ApiProperty({
    description: 'Murojaat ko‘chiriladigan maktab IDsi.',
    example: 'f7ed51a1-63a5-4d98-9472-f4aad4f96626',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Maktab IDsi UUID formatida bo‘lishi kerak' })
  schoolId: string;
}
