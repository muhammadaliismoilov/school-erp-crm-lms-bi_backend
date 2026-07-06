import {
  base32Decode,
  base32Encode,
  buildOtpauthUrl,
  generateTotpSecret,
  totpAt,
  verifyTotp,
} from '../src/modules/auth/totp.util';

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 test-vektor siri: ASCII "12345678901234567890"
  const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

  it('RFC 6238 test-vektorlari (SHA1, 6 raqamga qisqartirilgan)', () => {
    // T=59s → counter=1 → 8 raqamli 94287082 → 6 raqamli 287082
    expect(totpAt(RFC_SECRET, 1)).toBe('287082');
    // T=1111111109 → counter=37037036 → 07081804
    expect(totpAt(RFC_SECRET, 37037036)).toBe('081804');
    // T=1234567890 → counter=41152263 → 89005924
    expect(totpAt(RFC_SECRET, 41152263)).toBe('005924');
  });

  it('verifyTotp — to‘g‘ri kod, ±1 qadam oynasi, noto‘g‘ri kod', () => {
    const nowMs = 59_000; // counter=1
    expect(verifyTotp(RFC_SECRET, '287082', nowMs)).toBe(true);
    // Oldingi qadam kodi (counter=0 → 94755224 → 755224) window=1 da qabul qilinadi
    expect(verifyTotp(RFC_SECRET, '755224', nowMs)).toBe(true);
    expect(verifyTotp(RFC_SECRET, '000000', nowMs)).toBe(false);
    expect(verifyTotp(RFC_SECRET, '28708', nowMs)).toBe(false); // 5 raqam
    expect(verifyTotp(RFC_SECRET, '287 082', nowMs)).toBe(true); // bo'shliqqa chidamli
  });

  it('base32 encode/decode — round-trip', () => {
    const buf = Buffer.from('salom dunyo 123');
    expect(base32Decode(base32Encode(buf)).toString()).toBe('salom dunyo 123');
  });

  it('generateTotpSecret — 20 bayt / 32 belgi, faqat base32 alifbosi', () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(s)).toHaveLength(20);
  });

  it('buildOtpauthUrl — Authenticator formatiga mos', () => {
    const url = buildOtpauthUrl('ABC234', 'admin');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('secret=ABC234');
    expect(url).toContain('issuer=Yuton%20School');
    expect(url).toContain('digits=6');
  });
});
