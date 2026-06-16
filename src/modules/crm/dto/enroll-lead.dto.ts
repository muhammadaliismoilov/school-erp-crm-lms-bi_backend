import { ApiProperty } from "@nestjs/swagger";

/** Result of converting a successful lead into an enrolled student. */
export class EnrollLeadResultDto {
  @ApiProperty({ example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7", format: "uuid" })
  studentId: string;

  @ApiProperty({ example: "ST-2026-0001" })
  studentCode: string;

  @ApiProperty({ example: "Valiyev Ali" })
  fullName: string;

  @ApiProperty({ example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7", format: "uuid" })
  leadId: string;
}
