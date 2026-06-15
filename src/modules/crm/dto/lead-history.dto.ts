import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LeadHistoryEntryDto {
  @ApiProperty({ example: "a1f35a94-92b4-4f1a-8a7a-90a78003892d", format: "uuid" })
  id: string;

  @ApiProperty({ example: "lead.created", description: "Audit amali kodi." })
  action: string;

  @ApiPropertyOptional({
    example: "Toshpulatov Jamshid",
    nullable: true,
    description: "Amalni bajargan foydalanuvchi. null bo'lsa tizim tomonidan.",
  })
  actorName?: string | null;

  @ApiProperty({ example: "2026-06-15T12:22:00.000Z", format: "date-time" })
  timestamp: string;

  @ApiPropertyOptional({ description: "Qo'shimcha tafsilotlar (masalan yangi status).", nullable: true })
  details?: Record<string, unknown> | null;
}
