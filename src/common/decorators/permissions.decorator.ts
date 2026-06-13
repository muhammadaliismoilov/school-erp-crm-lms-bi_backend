import { applyDecorators, SetMetadata } from '@nestjs/common';
import { PermissionMatchMode } from '../security/permission.matcher';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MATCH_MODE_KEY = 'permissionsMatchMode';

export const Permissions = (
  permissions: string[],
  matchMode = PermissionMatchMode.EVERY,
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSIONS_MATCH_MODE_KEY, matchMode),
  );
