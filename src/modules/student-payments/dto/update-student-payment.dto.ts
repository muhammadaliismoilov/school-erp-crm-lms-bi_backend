import { PartialType } from '@nestjs/swagger';
import { CreateStudentPaymentDto } from './create-student-payment.dto';

/** Barcha maydonlar ixtiyoriy — qisman (PATCH) yangilash uchun. */
export class UpdateStudentPaymentDto extends PartialType(CreateStudentPaymentDto) {}
