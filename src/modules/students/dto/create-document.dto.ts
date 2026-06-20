import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class CreateDocumentDto {
  @ApiProperty({ example: "passport", description: "Hujjat turi", maxLength: 80 })
  @IsString()
  @Length(1, 80)
  type: string;

  @ApiProperty({ example: "https://cdn/file.pdf", description: "Fayl manzili" })
  @IsString()
  @Length(1, 2000)
  fileUrl: string;
}
