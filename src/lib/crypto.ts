import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY ?? "0".repeat(64);
const KEY = Buffer.from(KEY_HEX, "hex");

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
