/**
 * User-Agent satridan qisqa, odam o'qiy oladigan qurilma nomi:
 * "Chrome 126 · Linux", "Safari · iPhone". Qurilmalar sahifasida foydalanuvchi
 * o'z sessiyalarini bir qarashda taniy olishi uchun.
 */
export function parseDeviceInfo(ua?: string | null): string | null {
  if (!ua) return null;

  // Tartib muhim: Chrome UA'sida "Safari" ham bor, Edge'da "Chrome" ham.
  let browser: string | null = null;
  const rules: Array<[RegExp, string]> = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+).*Safari/, 'Safari'],
  ];
  for (const [re, name] of rules) {
    const m = ua.match(re);
    if (m) {
      browser = `${name} ${m[1]}`;
      break;
    }
  }

  let os: string | null = null;
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';

  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  if (os) return os;
  // Notanish UA (masalan API mijozi) — qisqartirib xom holda saqlaymiz.
  return ua.slice(0, 120);
}
