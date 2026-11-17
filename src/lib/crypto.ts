import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function key(secret: string, purpose: string): Buffer {
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

/** AES-256-GCM. Output: base64url(iv | tag | ciphertext). */
export function encrypt(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret, "token-encryption"), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

export function decrypt(payload: string, secret: string): string {
  const buf = Buffer.from(payload, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(secret, "token-encryption"), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** Signed, expiring value: base64url(json).signature */
export function sign(data: object, secret: string, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  const sig = createHmac("sha256", key(secret, "signing")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify<T extends object>(token: string | undefined, secret: string): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key(secret, "signing")).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data as T;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
