import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';

/**
 * Access token tarkibi.
 *
 * `permissions` ATAYLAB yo'q: `ceo`/`director`da ular 439 tagacha yetadi va
 * token 15 KB dan oshadi — brauzerning qolgan sarlavhalari bilan birga bu
 * 16 KB limitidan oshib, har bir so'rov HTTP 431 bilan rad etiladi. Ruxsatlar
 * har so'rovda `PermissionRegistryService` orqali o'qiladi.
 */
export interface JwtPayload extends Omit<AuthenticatedUser, 'permissions'> {
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
