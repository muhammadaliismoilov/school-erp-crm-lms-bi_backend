import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataScope } from '../../common/scope/data-scope.enum';
import { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { JwtPayload } from './auth.types';
import { PermissionRegistryService } from './permission-registry.service';
import { SessionRegistryService } from './session-registry.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly sessionRegistry: SessionRegistryService,
    private readonly permissionRegistry: PermissionRegistryService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Sessiya jonligi: qurilma "chiqarib tashlangan" bo'lsa, access token
    // muddati (15 daq) tugashini kutmasdan darhol rad etamiz (30s kesh bilan).
    if (!payload.sessionId || !(await this.sessionRegistry.isAlive(payload.sessionId))) {
      throw new UnauthorizedException('Sessiya bekor qilingan — qaytadan kiring');
    }
    this.sessionRegistry.touch(payload.sessionId);

    // Ruxsatlar tokendan EMAS, reyestrdan (30s kesh) o'qiladi — token ichida
    // ular 15 KB sarlavha yasab, so'rovlarni HTTP 431 bilan yiqitardi.
    const permissions = await this.permissionRegistry.codesForUser(payload.sub);

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions,
      sessionId: payload.sessionId,
      schoolId: payload.schoolId ?? null,
      branchId: payload.branchId ?? null,
      // Eski (migratsiyadan oldin berilgan) tokenlarda maydon yo'q — keng holat.
      dataScope: payload.dataScope ?? DataScope.ALL,
    };
  }
}
