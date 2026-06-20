import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { Gender, StudentStatus } from "../enums/student-status.enum";

/** O‘quvchilar ro‘yxati uchun filtrlar (jins, sinf, holat) + qidiruv/sahifalash. */
export class QueryStudentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Gender, description: "Jins bo‘yicha filtr" })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ format: "uuid", description: "Sinf bo‘yicha filtr" })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ enum: StudentStatus, description: "Holat bo‘yicha filtr" })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
