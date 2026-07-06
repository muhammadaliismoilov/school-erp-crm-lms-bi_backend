import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { JwtPayload } from './auth.types';
import { SessionRegistryService } from './session-registry.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly sessionRegistry: SessionRegistryService,
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

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      sessionId: payload.sessionId,
      schoolId: payload.schoolId ?? null,
      branchId: payload.branchId ?? null,
    };
  }
}
