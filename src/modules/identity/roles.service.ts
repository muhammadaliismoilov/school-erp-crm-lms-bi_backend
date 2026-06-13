import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import type { LocalizedText } from '../../common/i18n/locale';
import { normalizeOptionalLocalizedText } from '../../common/i18n/localized-text.util';
import {
  PERMISSION_CATEGORIES,
  actionLabel,
  categoryForModule,
  moduleLabel,
  type PermissionCategoryKey,
} from '../../common/constants/permission-catalog';
import type {
  CatalogPermissionSchema,
  PermissionCatalogResponseSchema,
} from './swagger/permission-catalog.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionResponseSchema, RoleListResponseSchema, RoleResponseSchema } from './swagger/role-response.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
  ) {}

  async findAll(query: Partial<RoleQueryDto> = {}): Promise<RoleListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.nullableText(query.search)?.toLowerCase();
    const allRoles = await this.roles.find({ order: { name: 'ASC' } });
    const filteredRoles = search
      ? allRoles.filter((role) => this.roleMatchesSearch(role, search))
      : allRoles;
    const total = filteredRoles.length;
    const items = filteredRoles.slice((page - 1) * limit, page * limit);
    const [roleCount, permissionCount] = await Promise.all([
      this.roles.count(),
      this.permissions.count(),
    ]);

    return {
      items: items.map((role) => this.toRoleResponse(role)),
      meta: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit) || 1,
      },
      stats: {
        roleCount,
        permissionCount,
        foundCount: total,
      },
    };
  }

  async findOne(id: string): Promise<RoleResponseSchema> {
    return this.toRoleResponse(await this.findRoleEntity(id));
  }

  /**
   * Builds the category → resource → action permission tree consumed by the
   * role editor. Driven entirely by the permissions stored in the DB, so it
   * stays correct as the permission set grows; unmapped modules land in "Boshqa".
   */
  async getPermissionCatalog(): Promise<PermissionCatalogResponseSchema> {
    const permissions = await this.permissions.find();

    const grouped = new Map<PermissionCategoryKey, Map<string, CatalogPermissionSchema[]>>();
    for (const permission of permissions) {
      const categoryKey = categoryForModule(permission.module);
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, new Map());
      }
      const resources = grouped.get(categoryKey)!;
      if (!resources.has(permission.module)) {
        resources.set(permission.module, []);
      }
      resources.get(permission.module)!.push({
        code: permission.code,
        action: permission.action,
        label: actionLabel(permission.action),
      });
    }

    const categories = PERMISSION_CATEGORIES.slice()
      .sort((first, second) => first.order - second.order)
      .map((categoryMeta) => {
        const resourceMap = grouped.get(categoryMeta.key);
        const resources = resourceMap
          ? Array.from(resourceMap.entries())
              .map(([module, perms]) => ({
                module,
                label: moduleLabel(module),
                permissionCount: perms.length,
                permissions: perms.sort((a, b) => a.action.localeCompare(b.action)),
              }))
              .sort((a, b) => a.label.uz.localeCompare(b.label.uz))
          : [];
        const permissionCount = resources.reduce((sum, resource) => sum + resource.permissionCount, 0);
        return {
          key: categoryMeta.key,
          label: categoryMeta.label,
          permissionCount,
          resources,
        };
      })
      .filter((category) => category.resources.length > 0);

    return { totalPermissions: permissions.length, categories };
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseSchema> {
    const name = this.normalizeRoleName(dto.name);
    await this.ensureRoleNameIsAvailable(name);
    const permissions = await this.resolvePermissions(dto.permissionCodes);
    const title = this.buildLocalizedText(dto.title, dto.name);

    const role = await this.roles.save(
      this.roles.create({
        name,
        title,
        description: normalizeOptionalLocalizedText(dto.description),
        isSystem: false,
        permissions,
      }),
    );

    return this.toRoleResponse(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one role field must be provided');
    }

    const role = await this.findRoleEntity(id);
    if (dto.name !== undefined) {
      const name = this.normalizeRoleName(dto.name);
      if (role.isSystem && name !== role.name) {
        throw new BadRequestException('System role name cannot be changed');
      }
      await this.ensureRoleNameIsAvailable(name, id);
      role.name = name;
      if (dto.title === undefined) {
        role.title = this.buildLocalizedText(undefined, dto.name);
      }
    }
    if (dto.title !== undefined) {
      role.title = this.buildLocalizedText(dto.title, dto.name ?? role.name);
    }
    if (dto.description !== undefined) {
      role.description = normalizeOptionalLocalizedText(dto.description);
    }
    if (dto.permissionCodes !== undefined) {
      role.permissions = await this.resolvePermissions(dto.permissionCodes);
    }

    return this.toRoleResponse(await this.roles.save(role));
  }

  async remove(id: string): Promise<void> {
    const role = await this.findRoleEntity(id);

    if (role.isSystem) {
      throw new BadRequestException('System role cannot be deleted');
    }

    await this.roles.softDelete(id);
  }

  async resolvePermissions(permissionCodes: string[]): Promise<Permission[]> {
    const uniqueCodes = Array.from(new Set(permissionCodes.map((code) => code.trim())));
    const permissions = await this.permissions.find({
      where: { code: In(uniqueCodes) },
    });
    const missing = uniqueCodes.filter(
      (code) => !permissions.some((permission) => permission.code === code),
    );

    if (missing.length > 0) {
      throw new NotFoundException(`Unknown permissions: ${missing.join(', ')}`);
    }

    return permissions;
  }

  private async findRoleEntity(id: string): Promise<Role> {
    const role = await this.roles.findOne({
      where: { id },
      relations: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private async ensureRoleNameIsAvailable(name: string, excludeRoleId?: string): Promise<void> {
    const role = await this.roles.findOne({
      where: {
        name,
        ...(excludeRoleId ? { id: Not(excludeRoleId) } : {}),
      },
    });

    if (role) {
      throw new ConflictException('Role already exists');
    }
  }

  private roleMatchesSearch(role: Role, search: string): boolean {
    return [
      role.name,
      role.title?.uz,
      role.title?.ru,
      role.title?.en,
      ...(role.permissions?.map((permission) => permission.code) ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  }

  private toRoleResponse(role: Role): RoleResponseSchema {
    const permissions = this.toPermissionResponses(role.permissions ?? []);

    return {
      id: role.id,
      name: role.name,
      displayName: role.name.toUpperCase().replace(/-/g, '_'),
      title: role.title?.uz ?? role.title?.en ?? role.name,
      description: role.description?.uz ?? role.description?.en ?? null,
      isSystem: role.isSystem,
      permissionCount: permissions.length,
      permissions,
      createdAt: role.createdAt?.toISOString(),
      updatedAt: role.updatedAt?.toISOString(),
      version: role.version,
    };
  }

  private toPermissionResponses(permissions: Permission[]): PermissionResponseSchema[] {
    return permissions
      .slice()
      .sort((first, second) => first.code.localeCompare(second.code))
      .map((permission) => ({
        code: permission.code,
        module: permission.module,
        action: permission.action,
      }));
  }

  private buildLocalizedText(value: Partial<LocalizedText> | undefined, fallback: string): LocalizedText {
    const normalizedFallback = this.toTitleText(fallback);
    const uz = value?.uz?.trim() || normalizedFallback;
    const ru = value?.ru?.trim() || uz;
    const en = value?.en?.trim() || uz;

    return { uz, ru, en };
  }

  private normalizeRoleName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
  }

  private toTitleText(value: string): string {
    return value.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length > 0 ? normalized : null;
  }
}
