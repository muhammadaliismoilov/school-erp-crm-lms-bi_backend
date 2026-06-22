import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { Gender } from "../enums/student-status.enum";

/** Ketgan (soft-delete qilingan) o‘quvchilar ro‘yxati uchun filtrlar. */
export class QueryDepartedDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Gender, description: "Jins bo‘yicha filtr" })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ format: "uuid", description: "Sinf bo‘yicha filtr" })
  @IsOptional()
  @IsUUID()
  classId?: string;
}
