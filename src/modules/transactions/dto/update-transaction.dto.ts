import { PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

/** Tranzaksiyani qisman tahrirlash. Barcha maydonlar ixtiyoriy. */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
