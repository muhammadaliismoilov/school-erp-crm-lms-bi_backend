import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TurnstileDirection } from '../../../common/enums/turnstile-direction.enum';

export class CreateTurnstileDeviceDto {
  @ApiProperty({ example: 'GATE-01', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  deviceNumber: string;

  @ApiPropertyOptional({ example: 'Asosiy kirish', maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  name?: string;

  @ApiPropertyOptional({ enum: TurnstileDirection, default: TurnstileDirection.BOTH })
  @IsOptional()
  @IsEnum(TurnstileDirection)
  direction?: TurnstileDirection;
}

export class UpdateTurnstileDeviceDto extends PartialType(CreateTurnstileDeviceDto) {
  @ApiPropertyOptional({ description: 'Qurilmani faol/nofaol qilish.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
