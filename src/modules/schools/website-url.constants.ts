/**
 * `website_url` maydoni endi ikki vazifani bajaradi: ma'lumot sifatida
 * ko'rsatish VA subdomain-tenant login uchun manba (ko'ring:
 * SchoolsService.resolveByHostname). Shu sababli qiymat qat'iy shaklda
 * bo'lishi shart — aks holda o'sha maktab xodimlari umuman kira olmay
 * qoladi. Zaxiralangan nomlar keyinchalik boshqa maqsadlar (admin panel,
 * API, statik fayllar va h.k.) uchun ajratilgan — maktab subdomeni
 * bo'la olmaydi.
 */
export const RESERVED_SCHOOL_SUBDOMAINS = [
  'admin',
  'api',
  'www',
  'app',
  'static',
  'assets',
  'cdn',
  'mail',
  'ftp',
  'docs',
  'support',
  'help',
  'blog',
  'status',
  'dashboard',
] as const;

export const SCHOOL_WEBSITE_URL_PATTERN = new RegExp(
  `^https?://(?!(?:${RESERVED_SCHOOL_SUBDOMAINS.join('|')})\\.crm\\.uz(?:/.*)?$)[a-z0-9-]{2,32}\\.crm\\.uz/?$`,
  'i',
);

export const SCHOOL_WEBSITE_URL_MESSAGE =
  "Veb-sayt manzili https://<nom>.crm.uz formatida bo'lishi va zaxiralangan nomlardan (admin, api, www va h.k.) foydalanmasligi kerak";
