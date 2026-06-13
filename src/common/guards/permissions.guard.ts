import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MATCH_MODE_KEY,
} from "../decorators/permissions.decorator";
import { AuthenticatedUser } from "../security/authenticated-user.interface";
import {
  PermissionMatchMode,
  userSatisfiesPermissions,
} from "../security/permission.matcher";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const matchMode =
      this.reflector.getAllAndOverride<PermissionMatchMode>(
        PERMISSIONS_MATCH_MODE_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? PermissionMatchMode.EVERY;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException("Authentication is required");
    }

    const assignedPermissions = new Set(request.user.permissions ?? []);
    const allowed = userSatisfiesPermissions(
      requiredPermissions,
      assignedPermissions,
      matchMode,
    );

    if (!allowed) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
