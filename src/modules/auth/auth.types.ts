import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';

export interface JwtPayload extends AuthenticatedUser {
  sub: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
  user: AuthenticatedUser;
}

export interface RequestMeta {
  ipAddress?: string;
  deviceInfo?: string;
}
