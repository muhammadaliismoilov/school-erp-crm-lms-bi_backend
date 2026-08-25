import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataScope } from '../../../common/scope/data-scope.enum';

export class PermissionResponseSchema {
  @ApiProperty({ example: 'students.read' })
  code: string;

  @ApiProperty({ example: 'students' })
  module: string;

  @ApiProperty({ example: 'read' })
  action: string;
}

export class RoleResponseSchema {
  @ApiProperty({ example: 'c9c1df8f-2c6d-4f55-a60a-d29127b3ebd6', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'teacher' })
  name: string;

  @ApiProperty({ example: 'TEACHER' })
  displayName: string;

  @ApiProperty({ example: "O'qituvchi" })
  title: string;

  @ApiPropertyOptional({ example: 'Dars beruvchi xodim', nullable: true })
  description?: string | null;

  @ApiProperty({ example: false })
  isSystem: boolean;

  @ApiProperty({
    description:
      "Himoyalangan rol (direktor, CEO) — faqat 'roles.manage-privileged' egasi tahrirlaydi/o'chiradi/biriktiradi.",
    example: false,
  })
  isPrivileged: boolean;

  @ApiProperty({
    description: "Ma'lumot doirasi — imtiyozlardan alohida qatlam (qaysi qatorlar).",
    enum: DataScope,
    example: DataScope.ALL,
  })
  dataScope: DataScope;

  @ApiProperty({ example: 77 })
  permissionCount: number;

  @ApiProperty({ type: [PermissionResponseSchema] })
  permissions: PermissionResponseSchema[];

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class RolePageMetaSchema {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 7 })
  total: number;

  @ApiProperty({ example: 1 })
  pageCount: number;
}

export class RoleStatsSchema {
  @ApiProperty({ example: 7 })
  roleCount: number;

  @ApiProperty({ example: 968 })
  permissionCount: number;

  @ApiProperty({ example: 7 })
  foundCount: number;
}

export class RoleListResponseSchema {
  @ApiProperty({ type: [RoleResponseSchema] })
  items: RoleResponseSchema[];

  @ApiProperty({ type: RolePageMetaSchema })
  meta: RolePageMetaSchema;

  @ApiProperty({ type: RoleStatsSchema })
  stats: RoleStatsSchema;
}
