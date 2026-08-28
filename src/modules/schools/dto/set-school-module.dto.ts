import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';
import { GATED_MODULE_KEYS, type GatedModule } from '../gated-modules';

export class SetSchoolModuleDto {
  @ApiProperty({
    description: 'Maktab darajasida boshqariladigan modul kaliti.',
    enum: GATED_MODULE_KEYS,
    example: 'integrations',
  })
  @IsIn(GATED_MODULE_KEYS)
  module: GatedModule;

  @ApiProperty({ description: 'Yoqilganmi.', example: true })
  @IsBoolean()
  enabled: boolean;
}
