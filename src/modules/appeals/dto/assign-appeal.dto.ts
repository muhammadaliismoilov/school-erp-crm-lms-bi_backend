import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AssignAppealDto {
  @ApiProperty({
    description:
      'Murojaat biriktiriladigan xodim IDsi. Biriktirishni bekor qilish uchun null yuboring.',
    example: '0f8fad5b-d9cb-469f-a165-70867728950e',
    format: 'uuid',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID('4', { message: 'Xodim IDsi yaroqli UUID bo‘lishi kerak' })
  assigneeUserId: string | null;
}
