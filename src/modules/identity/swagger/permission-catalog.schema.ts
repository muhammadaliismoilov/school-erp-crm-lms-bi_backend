import { ApiProperty } from '@nestjs/swagger';

class LocalizedTextSchema {
  @ApiProperty({ example: "Ta'lim" })
  uz: string;

  @ApiProperty({ example: 'Образование' })
  ru: string;

  @ApiProperty({ example: 'Education' })
  en: string;
}

export class CatalogPermissionSchema {
  @ApiProperty({ example: 'students.read' })
  code: string;

  @ApiProperty({ example: 'read' })
  action: string;

  @ApiProperty({ type: LocalizedTextSchema })
  label: LocalizedTextSchema;
}

export class CatalogResourceSchema {
  @ApiProperty({ example: 'students' })
  module: string;

  @ApiProperty({ type: LocalizedTextSchema })
  label: LocalizedTextSchema;

  @ApiProperty({ example: 2 })
  permissionCount: number;

  @ApiProperty({ type: [CatalogPermissionSchema] })
  permissions: CatalogPermissionSchema[];
}

export class CatalogCategorySchema {
  @ApiProperty({ example: 'talim' })
  key: string;

  @ApiProperty({ type: LocalizedTextSchema })
  label: LocalizedTextSchema;

  @ApiProperty({ example: 130 })
  permissionCount: number;

  @ApiProperty({ type: [CatalogResourceSchema] })
  resources: CatalogResourceSchema[];
}

export class PermissionCatalogResponseSchema {
  @ApiProperty({ example: 71, description: 'Tizimdagi jami imtiyozlar soni.' })
  totalPermissions: number;

  @ApiProperty({ type: [CatalogCategorySchema] })
  categories: CatalogCategorySchema[];
}
