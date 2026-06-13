import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class GroupMonthlyPaymentDto {
  @ApiProperty({ description: 'Guruh yoki sinf nomi.', example: '1A', minLength: 1, maxLength: 20 })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 20)
  groupName: string;

  @ApiProperty({ description: 'Ushbu guruh uchun oylik to‘lov.', example: 900000, minimum: 0, maximum: 100000000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  amount: number;
}
