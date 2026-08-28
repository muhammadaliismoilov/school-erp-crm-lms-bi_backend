/**
 * Maktab darajasida yoqib/o'chirib qo'yiladigan modullar — YAGONA manba.
 *
 * MUHIM: bu ro'yxat ATAYLAB qisqa. Faqat shu yerda sanalgan modullar bayroqqa
 * bo'ysunadi; qolgan hamma bo'lim (Ta'lim, Moliya, HR va h.k.) har doim ochiq
 * va ularga umuman tegilmaydi. Shu sabab noto'g'ri qorovul ishlayotgan
 * bo'limni yopib qo'yish xavfi minimal.
 *
 * `default: false` — yozuv bo'lmasa modul YOPIQ. Integratsiyalar aynan shunday
 * kiritildi: talab "hech bir maktabda ko'rinmasin, CEO tanlaganiga bersin".
 */
export const GATED_MODULES = {
  integrations: { default: false },
} as const;

export type GatedModule = keyof typeof GATED_MODULES;

export const GATED_MODULE_KEYS = Object.keys(GATED_MODULES) as GatedModule[];

export function isGatedModule(value: string): value is GatedModule {
  return Object.prototype.hasOwnProperty.call(GATED_MODULES, value);
}

/** Yozuv bo'lmaganda qo'llaniladigan holat. */
export function defaultEnabled(module: GatedModule): boolean {
  return GATED_MODULES[module].default;
}
