/**
 * So'rov qaysi maktabga tegishli — YAGONA manba.
 *
 * NEGA ALOHIDA FUNKSIYA: NestJS'da QOROVULLAR interceptor'lardan OLDIN
 * ishlaydi. Ya'ni `TenantScopeInterceptor` kontekstni to'ldirgunga qadar
 * qorovullar `TenantContextService.getSchoolId()` dan `null` oladi. Maktabga
 * bog'liq qorovul (masalan `SchoolModuleGuard`) shu sababli har doim rad
 * javob berardi. Ikkala joy ham shu funksiyani chaqiradi, shunda qoida
 * ikkiga bo'linib ketmaydi.
 *
 * Qoida: maktabga BOG'LANGAN foydalanuvchi o'z maktabiga qadalgan va
 * `X-School-Id` e'tiborsiz qoladi; GLOBAL foydalanuvchi (schoolId=null,
 * masalan super-admin yoki global CEO) sarlavha bilan maktab tanlaydi.
 */
export function resolveRequestSchoolId(
  userSchoolId: string | null | undefined,
  headerSchoolId: unknown,
): string | null {
  if (userSchoolId) return userSchoolId;
  return typeof headerSchoolId === 'string' && headerSchoolId.length > 0 ? headerSchoolId : null;
}
