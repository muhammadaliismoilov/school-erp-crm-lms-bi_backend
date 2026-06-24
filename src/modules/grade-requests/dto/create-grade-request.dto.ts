import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { GradeRequestKind } from '../entities/grade-change-request.entity';

export class CreateGradeRequestDto {
  @ApiProperty({ enum: GradeRequestKind, example: GradeRequestKind.ASSESSMENT, description: 'Baho turi.' })
  @IsEnum(GradeRequestKind, { message: 'Baho turi assessment, course yoki quarter bo‘lishi kerak' })
  kind: GradeRequestKind;

  @ApiProperty({ format: 'uuid', description: 'O‘quvchi IDsi.' })
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID formatida bo‘lishi kerak' })
  studentId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Fan IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Fan IDsi UUID formatida bo‘lishi kerak' })
  subjectId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Chorak IDsi (choraklik baho uchun).', nullable: true })
  @ValidateIf((o: CreateGradeRequestDto) => o.kind === GradeRequestKind.QUARTER || o.quarterId !== undefined)
  @IsUUID('4', { message: 'Chorak IDsi UUID formatida bo‘lishi kerak' })
  quarterId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'O‘zgartirilayotgan baho yozuvi IDsi (jurnal/choraklik/imtihon natijasi).',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Baho yozuvi IDsi UUID formatida bo‘lishi kerak' })
  targetEntityId?: string;

  @ApiPropertyOptional({ example: 3, description: 'Joriy baho (snapshot).', minimum: 0, maximum: 100, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Joriy baho son bo‘lishi kerak' })
  @Min(0, { message: 'Joriy baho 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Joriy baho 100 dan oshmasligi kerak' })
  currentGrade?: number;

  @ApiProperty({ example: 5, description: 'Talab qilinayotgan yangi baho.', minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Yangi baho son bo‘lishi kerak' })
  @Min(0, { message: 'Yangi baho 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Yangi baho 100 dan oshmasligi kerak' })
  requestedGrade: number;

  @ApiProperty({
    example: 'Imtihon qayta tekshirildi, qo‘shimcha ball berildi.',
    minLength: 3,
    maxLength: 2000,
    description: 'So‘rov sababi.',
  })
  @IsString({ message: 'Sabab matn bo‘lishi kerak' })
  @Length(3, 2000, { message: 'Sabab 3 dan 2000 belgigacha bo‘lishi kerak' })
  reason: string;
}
