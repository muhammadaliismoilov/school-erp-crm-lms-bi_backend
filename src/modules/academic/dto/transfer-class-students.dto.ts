import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class TransferClassStudentsDto {
  @ApiProperty({
    description: "Ko'chirish amalga oshirilayotgan o'quv yili IDsi.",
    example: '5c617a45-57a4-4864-89c8-96e299173908',
    format: 'uuid',
  })
  @IsUUID()
  academicYearId: string;

  @ApiProperty({
    description: "O'quvchilar ko'chiriladigan maqsad sinf IDsi.",
    example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    format: 'uuid',
  })
  @IsUUID()
  targetClassId: string;

  @ApiPropertyOptional({
    description:
      "Ko'chiriladigan o'quvchi IDlari. Berilmasa, manba sinfdagi barcha o'quvchilar ko'chiriladi.",
    type: [String],
    format: 'uuid',
    maxItems: 200,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
