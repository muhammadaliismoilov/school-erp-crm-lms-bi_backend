import { ForbiddenException } from '@nestjs/common';
import { CONFIDENTIAL_PERMISSION_CODES } from '../constants/permissions';
import { permissionMatches } from './permission.matcher';

/**
 * Imtiyoz oshirishga (privilege escalation) qarshi siyosat — T-02.
 *
 * Uch qoida, bitta manba:
 *  Q1 — AJRATISH: profil tahriri, rol biriktirish va parol tiklash alohida
 *       endpoint/ruxsatlar (`users.update` / `roles.assign` /
 *       `users.reset-password`). Bu fayl emas, controller qatlami bajaradi.
 *  Q2 — KUCHAYTIRMASLIK: beriladigan rolning ruxsatlari biriktiruvchining o'z
 *       ruxsatlarining QISM TO'PLAMI bo'lishi shart. Parol tiklashda ham xuddi
 *       shu, faqat nishon tomonidan: nishonning ruxsatlari tikluvchinikidan
 *       oshmasin (aks holda "parolini tiklab, u sifatida kiraman" yo'li ochiq).
 *  Q3 — O'ZIGA TEGMASLIK: foydalanuvchi o'z rollarini o'zgartira olmaydi va
 *       o'z parolini bu yo'l bilan tiklamaydi (o'z paroli uchun
 *       `/auth/change-password` bor — u eski parolni so'raydi).
 *
 * Super-admin (`*.*`) uchun uchchala qoida ham o'z-o'zidan o'tadi — wildcard
 * har qanday kodni qoplaydi, o'ziga tegish esa quyida aniq istisno qilinadi.
 *
 * MAXFIY KODLAR ISTISNOSI: psixolog rolining `counseling.*` kodlari admin/
 * direktorga ataylab berilmagan (CONFIDENTIAL_PERMISSION_CODES). Qattiq Q2
 * bilan admin psixolog akkauntini umuman yarata olmay qolardi. Shu sabab
 * qism-to'plam tekshiruvida maxfiy kodlar hisobga olinmaydi: maxfiylik
 * MA'LUMOTNI sessiya ichida o'qishdan himoya qiladi, akkaunt ochib berishdan
 * emas (akkauntlarni yaratuvchi administrator baribir provisioning nuqtasi).
 */

/** Siyosatga kerak bo'lgan minimal rol shakli — entity'ga bog'lanmaymiz. */
export interface GrantableRole {
  name: string;
  permissions?: { code: string }[] | null;
}

const CONFIDENTIAL = new Set<string>(CONFIDENTIAL_PERMISSION_CODES);

/** Aktor qoplay olmaydigan kodlar (maxfiylar chegirilgan holda). */
export function uncoveredPermissionCodes(
  actorPermissions: readonly string[],
  requiredCodes: Iterable<string>,
): string[] {
  const uncovered: string[] = [];
  for (const code of new Set(requiredCodes)) {
    if (CONFIDENTIAL.has(code)) continue;
    const covered = actorPermissions.some((assigned) => permissionMatches(assigned, code));
    if (!covered) uncovered.push(code);
  }
  return uncovered.sort();
}

/** Rollar to'plamining barcha ruxsat kodlari (takrorsiz). */
export function collectRoleCodes(roles: readonly GrantableRole[]): string[] {
  return Array.from(
    new Set(roles.flatMap((role) => role.permissions?.map((permission) => permission.code) ?? [])),
  );
}

/**
 * Q2: aktor faqat o'zida bor ruxsatlardan oshmaydigan rollarni bera oladi.
 * Xatoda qaysi rol va qaysi kodlar yetmasligi aytiladi — admin "nega
 * bo'lmayapti" deb taxmin qilib o'tirmasin.
 */
export function assertRolesGrantable(
  actorPermissions: readonly string[],
  roles: readonly GrantableRole[],
): void {
  for (const role of roles) {
    const uncovered = uncoveredPermissionCodes(
      actorPermissions,
      role.permissions?.map((permission) => permission.code) ?? [],
    );
    if (uncovered.length > 0) {
      const sample = uncovered.slice(0, 5).join(', ');
      throw new ForbiddenException(
        `'${role.name}' rolini biriktirib bo'lmaydi: unda sizda yo'q ruxsatlar bor (${sample}${
          uncovered.length > 5 ? ', …' : ''
        }). Rol ruxsatlari sizning ruxsatlaringizdan oshmasligi kerak.`,
      );
    }
  }
}

/**
 * Q2': aktor faqat o'zidan "kuchli bo'lmagan" foydalanuvchining parolini
 * tiklay oladi. Aks holda parol tiklash — o'sha akkaunt sifatida kirishning
 * qonuniy ko'rinishdagi yo'li bo'lib qolardi (masalan, admin super-adminning
 * parolini almashtirib, tizimni to'liq egallashi).
 */
export function assertPasswordResettable(
  actorPermissions: readonly string[],
  targetRoles: readonly GrantableRole[],
): void {
  const uncovered = uncoveredPermissionCodes(actorPermissions, collectRoleCodes(targetRoles));
  if (uncovered.length > 0) {
    throw new ForbiddenException(
      "Bu foydalanuvchining parolini tiklay olmaysiz: uning ruxsatlari siznikidan keng. " +
        "Parol tiklash — o'sha akkaunt nomidan kirish bilan barobar, shuning uchun " +
        "faqat o'zingizdan kuchli bo'lmagan foydalanuvchilar uchun ruxsat etiladi.",
    );
  }
}

/** Q3: o'z akkauntiga bu yo'llar bilan tegish taqiqlanadi. */
export function assertNotSelf(
  actorId: string | undefined,
  targetUserId: string,
  action: 'rol' | 'parol',
): void {
  if (actorId && actorId === targetUserId) {
    throw new ForbiddenException(
      action === 'rol'
        ? "O'z rollaringizni o'zgartira olmaysiz — buni boshqa administrator bajarishi kerak."
        : "O'z parolingizni bu yerdan emas, profil sozlamalaridagi \"Parolni almashtirish\" orqali yangilang.",
    );
  }
}

/** Texnik super-admin — siyosat cheklovlaridan mustasno. */
export function isSuperAdmin(actorPermissions: readonly string[]): boolean {
  return actorPermissions.some((code) => code.split('.')[0] === '*');
}
