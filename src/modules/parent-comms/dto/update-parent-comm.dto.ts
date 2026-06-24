import { PartialType } from '@nestjs/swagger';
import { CreateParentCommDto } from './create-parent-comm.dto';

/** Muloqotni qisman tahrirlash — barcha maydonlar ixtiyoriy. */
export class UpdateParentCommDto extends PartialType(CreateParentCommDto) {}
