/**
 * Symmetric encryption for OAuth refresh/access tokens stored at rest.
 *
 * Why: tokens grant ongoing access to a tenant's calendar. A DB leak would
 * otherwise hand the attacker every connected calendar. AES-256-GCM with a
 * 32-byte key from env keeps tokens unreadable without the key.
 *
 * Format: base64(iv | authTag | ciphertext). IV is 12 bytes (GCM standard),
 * tag is 16 bytes. We don't store the IV separately — it's prepended to the
 * payload so decrypt() can split it back out.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireEnv } from "@/lib/env";

const IV_LEN = 12;
const TAG_LEN = 16;

function loadKey(): Buffer {
  const raw = requireEnv("CALENDAR_TOKEN_KEY");
  // Accept hex (64 chars), base64 (44 chars), or raw 32-byte string. Hex is
  // preferred — easy to generate via `openssl rand -hex 32`.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  if (raw.length === 32) return Buffer.from(raw, "utf8");
  throw new Error(
    "CALENDAR_TOKEN_KEY must be 32 bytes (hex/base64/raw). Generate with `openssl rand -hex 32`.",
  );
}

export function encryptToken(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptToken(payload: string): string {
  const key = loadKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("Encrypted token payload is malformed (too short).");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
