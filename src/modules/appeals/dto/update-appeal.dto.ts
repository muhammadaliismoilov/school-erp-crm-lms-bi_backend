import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { CreateAppealDto } from './create-appeal.dto';

export class UpdateAppealDto extends PartialType(CreateAppealDto) {
  @ApiPropertyOptional({
    description:
      'Murojaatni resolved/rejected holatiga o‘tkazishda majburiy izoh. Boshqa holatlarda ixtiyoriy.',
    example: 'Masala hal qilindi, ota-onaga qo‘ng‘iroq qilindi.',
    minLength: 3,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Izoh matn formatida bo‘lishi kerak' })
  @Length(3, 2000, { message: 'Izoh uzunligi 3 dan 2000 belgigacha bo‘lishi kerak' })
  resolutionNote?: string;
}
