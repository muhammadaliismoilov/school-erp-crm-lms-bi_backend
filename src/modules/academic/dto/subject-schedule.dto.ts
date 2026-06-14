import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class SubjectScheduleQueryDto {
  @ApiPropertyOptional({
    description: "O‘qituvchi bo‘yicha jadvalni filtrlash. Berilmasa fanning barcha darslari qaytadi.",
    example: "8cf35a94-92b4-4f1a-8a7a-90a78003892d",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
