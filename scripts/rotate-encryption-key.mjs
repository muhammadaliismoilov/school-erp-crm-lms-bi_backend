#!/usr/bin/env node
/**
 * ENCRYPTION_KEY aylantirish — barcha `v1.<iv>.<tag>.<ciphertext>` qiymatlarini
 * eski kalit bilan ochib, yangi kalit bilan qayta shifrlaydi.
 *
 * Ishlatilishi:
 *   OLD_ENCRYPTION_KEY=... NEW_ENCRYPTION_KEY=... node scripts/rotate-encryption-key.mjs [--dry-run]
 *
 * OLD berilmasa, `.env` dagi joriy ENCRYPTION_KEY olinadi. Skript tranzaksiyada
 * ishlaydi: bitta qiymat ochilmasa, hech narsa yozilmaydi.
 *
 * Qamrov (EncryptionService ishlatadigan joylar):
 *   - counseling_sessions.notes_encrypted  (matn ustuni)
 *   - integrations.config                  (jsonb; sir maydonlari qiymat sifatida)
 */
import { readFileSync } from "node:fs";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const KEY_SALT = "yuton-encryption-v1"; // EncryptionService bilan bir xil bo'lishi SHART
const FORMAT_PREFIX = "v1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

/** .env ni oddiy parse qilish (KEY=VALUE, izohlarsiz). */
function readEnv() {
  const out = {};
  let raw;
  try {
    raw = readFileSync(path.join(root, ".env"), "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = readEnv();
const oldSecret = process.env.OLD_ENCRYPTION_KEY ?? env.ENCRYPTION_KEY;
const newSecret = process.env.NEW_ENCRYPTION_KEY;

if (!oldSecret || !newSecret) {
  console.error("OLD_ENCRYPTION_KEY (yoki .env dagi ENCRYPTION_KEY) va NEW_ENCRYPTION_KEY kerak.");
  process.exit(1);
}
if (oldSecret === newSecret) {
  console.error("Eski va yangi kalit bir xil — aylantirishning hojati yo'q.");
  process.exit(1);
}
if (newSecret.length < 32) {
  console.error("NEW_ENCRYPTION_KEY kamida 32 belgi bo'lsin (production validatsiyasi shuni talab qiladi).");
  process.exit(1);
}

const oldKey = scryptSync(oldSecret, KEY_SALT, KEY_LENGTH);
const newKey = scryptSync(newSecret, KEY_SALT, KEY_LENGTH);

const isEncrypted = (v) => typeof v === "string" && v.startsWith(`${FORMAT_PREFIX}.`) && v.split(".").length === 4;

function decrypt(payload, key) {
  const [, ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

function encrypt(plaintext, key) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [FORMAT_PREFIX, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

const rotate = (value) => encrypt(decrypt(value, oldKey), newKey);

const client = new pg.Client({
  host: env.DATABASE_HOST ?? "localhost",
  port: Number(env.DATABASE_PORT ?? 5432),
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
});

let rotated = 0;
let skipped = 0;

await client.connect();
try {
  await client.query("BEGIN");

  // 1) counseling_sessions.notes_encrypted
  const notes = await client.query("select id, notes_encrypted from counseling_sessions where notes_encrypted is not null");
  for (const row of notes.rows) {
    if (!isEncrypted(row.notes_encrypted)) {
      skipped += 1;
      continue;
    }
    const next = rotate(row.notes_encrypted);
    if (!dryRun) {
      await client.query("update counseling_sessions set notes_encrypted = $1 where id = $2", [next, row.id]);
    }
    rotated += 1;
  }

  // 2) integrations.config — sir maydonlari config ichida qiymat sifatida turadi
  const integrations = await client.query("select id, config from integrations where config is not null");
  for (const row of integrations.rows) {
    const config = row.config ?? {};
    let changed = false;
    const next = {};
    for (const [key, value] of Object.entries(config)) {
      if (isEncrypted(value)) {
        next[key] = rotate(value);
        changed = true;
        rotated += 1;
      } else {
        next[key] = value;
      }
    }
    if (changed && !dryRun) {
      await client.query("update integrations set config = $1 where id = $2", [JSON.stringify(next), row.id]);
    }
  }

  if (dryRun) {
    await client.query("ROLLBACK");
    console.log(`[dry-run] ${rotated} ta qiymat aylantirilardi, ${skipped} ta e'tiborsiz qoldirildi. Hech narsa yozilmadi.`);
  } else {
    await client.query("COMMIT");
    console.log(`Tayyor: ${rotated} ta qiymat yangi kalit bilan qayta shifrlandi, ${skipped} ta e'tiborsiz qoldirildi.`);
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Aylantirish bekor qilindi (hech narsa o'zgarmadi):", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
