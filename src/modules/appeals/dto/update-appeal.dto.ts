import { PartialType } from '@nestjs/swagger';
import { CreateAppealDto } from './create-appeal.dto';

export class UpdateAppealDto extends PartialType(CreateAppealDto) {}
