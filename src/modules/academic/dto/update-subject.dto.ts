import { PartialType } from '@nestjs/swagger';
import { CreateSubjectDto } from './create-subject.dto';

/**
 * Every subject field is optional on update. `status` and `isActive` are
 * inherited from CreateSubjectDto (which now carries the active toggle too),
 * so the active state can be set on both create and update.
 */
export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}
