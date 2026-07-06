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

/** 2FA yoqilgan foydalanuvchi uchun login'ning birinchi bosqichi javobi. */
export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  /** Qisqa muddatli (5 daq) token — /auth/2fa/verify ga kod bilan yuboriladi. */
  twoFactorToken: string;
}
