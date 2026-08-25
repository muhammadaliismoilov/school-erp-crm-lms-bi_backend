import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResolveSchoolQueryDto {
  @ApiProperty({
    example: 'elegantschool.crm.uz',
    description: 'Brauzerda ochilgan to‘liq hostname (port va protokolsiz).',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9.-]+$/i, { message: 'hostname noto‘g‘ri formatda' })
  hostname: string;
}
