/**
 * Rolga biriktiriladigan MA'LUMOT DOIRASI — ruxsat tizimidan ALOHIDA qatlam.
 *
 * Ruxsat (`students.read`) "qaysi AMALNI qila oladi" degan savolga javob
 * beradi; doira esa "QAYSI QATORLAR ustida" degan savolga. Ikkisi ko'paytma
 * bo'lib ishlaydi: `students.read` + `OWN` = faqat o'z sinflaridagi
 * o'quvchilarni o'qiy oladi.
 *
 * Doira hech qachon ruxsat bermaydi — faqat toraytiradi. Shu sabab uni
 * ruxsat kodlariga aralashtirib yubormaslik kerak edi: aks holda har bir
 * kodning "hammasi" va "o'ziniki" varianti kerak bo'lib, katalog ikki
 * barobar shishardi.
 */
export enum DataScope {
  /** Maktab/filial chegarasidagi barcha qatorlar (tenant filtri baribir amal qiladi). */
  ALL = 'all',
  /** Faqat foydalanuvchining "o'ziniki": o'z sinflari va o'z farzandlari. */
  OWN = 'own',
}

/**
 * Foydalanuvchining shu so'rov uchun hisoblangan "o'ziniki" identifikatorlari.
 * Bo'sh massivlar — hech narsa ko'rinmaydi (ochiq qoldirish emas, yopish).
 */
export interface OwnScope {
  /** Sinf rahbarligi ∪ dars jadvalida biriktirilgan sinflar. */
  classIds: string[];
  /** Ota-ona sifatida bog'langan o'quvchilar. */
  studentIds: string[];
}

export const EMPTY_OWN_SCOPE: OwnScope = { classIds: [], studentIds: [] };

/**
 * Rollar qo'shiluvchi (additive): foydalanuvchida bitta ham `ALL` rol bo'lsa,
 * u to'liq ko'radi. Aks holda `OWN`. Rolsiz foydalanuvchi — `OWN` (yopiq).
 */
export function widestDataScope(scopes: readonly DataScope[]): DataScope {
  return scopes.some((scope) => scope === DataScope.ALL) ? DataScope.ALL : DataScope.OWN;
}
