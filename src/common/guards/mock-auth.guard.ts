import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppPermission, WRITE_BUNDLES } from '../constants/permissions';

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Stub user for development/mock testing of newly added modules
    request.user = {
      id: 'mock-admin-id',
      roles: ['Admin'],
      permissions: [
        AppPermission.APPEALS_READ,
        ...WRITE_BUNDLES.appeals,
        AppPermission.INTEGRATIONS_READ,
        ...WRITE_BUNDLES.integrations,
      ],
    };

    if (!request.user) {
      throw new UnauthorizedException('Tizimga kirish talab etiladi.');
    }

    return true;
  }
}
