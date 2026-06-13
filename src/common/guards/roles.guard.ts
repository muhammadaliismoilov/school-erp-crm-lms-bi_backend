import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException(
        "Ushbu amalni bajarish uchun ruxsatingiz yetarli emas (Foydalanuvchi roli topilmadi).",
      );
    }

    const hasRole = () =>
      user.roles.some((role: string) => requiredRoles.includes(role));

    if (!hasRole()) {
      throw new ForbiddenException(
        "Ushbu amalni bajarish uchun ruxsatingiz yetarli emas.",
      );
    }

    return true;
  }
}
