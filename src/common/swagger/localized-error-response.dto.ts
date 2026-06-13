import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocalizedTextDto {
  @ApiProperty({ example: "Kiritilgan ma'lumotlar noto'g'ri" })
  uz: string;

  @ApiProperty({ example: 'Введенные данные некорректны' })
  ru: string;

  @ApiProperty({ example: 'The submitted data is invalid' })
  en: string;
}

export class LocalizedValidationConstraintDto {
  @ApiProperty({ example: 'isEmail' })
  type: string;

  @ApiProperty({ type: LocalizedTextDto })
  message: LocalizedTextDto;
}

export class LocalizedValidationDetailDto {
  @ApiProperty({ example: 'email' })
  field: string;

  @ApiProperty({ type: [LocalizedValidationConstraintDto] })
  messages: LocalizedValidationConstraintDto[];
}

export class LocalizedErrorDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'VALIDATION_FAILED' })
  code: string;

  @ApiProperty({ example: 'uz', enum: ['uz', 'ru', 'en'] })
  locale: 'uz' | 'ru' | 'en';

  @ApiProperty({ example: "Kiritilgan ma'lumotlar noto'g'ri" })
  message: string;

  @ApiProperty({ type: LocalizedTextDto })
  messages: LocalizedTextDto;

  @ApiPropertyOptional({ type: [LocalizedValidationDetailDto] })
  details?: LocalizedValidationDetailDto[];

  @ApiProperty({ example: '/api/v1/auth/login' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: '2026-06-07T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class LocalizedErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ type: LocalizedErrorDto })
  error: LocalizedErrorDto;
}
