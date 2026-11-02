import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

/** Hashes a password as `scrypt$N$r$p$salt$hash`, with a random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(actual, expected);
}
