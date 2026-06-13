import { PartialType } from '@nestjs/swagger';
import { CreateQuarterDto } from './create-quarter.dto';

export class UpdateQuarterDto extends PartialType(CreateQuarterDto) {}
