import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import crypto from "crypto";

// noble/ed25519 v2 requires setting the sha512 hash
ed.etc.sha512Sync = (...m) => {
  const h = sha512.create();
  m.forEach((msg) => h.update(msg));
  return h.digest();
};

function canonicalize(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return {
    publicKey: Buffer.from(publicKeyBytes).toString("base64"),
    privateKey: Buffer.from(privateKeyBytes).toString("base64"),
  };
}

export async function sign(
  payload: Record<string, unknown>,
  privateKeyBase64: string
): Promise<string> {
  const message = new TextEncoder().encode(canonicalize(payload));
  const privateKey = Buffer.from(privateKeyBase64, "base64");
  const signature = await ed.signAsync(message, privateKey);
  return Buffer.from(signature).toString("base64");
}

export async function verify(
  payload: Record<string, unknown>,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const message = new TextEncoder().encode(canonicalize(payload));
    const signature = Buffer.from(signatureBase64, "base64");
    const publicKey = Buffer.from(publicKeyBase64, "base64");
    return await ed.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}

export function encryptPrivateKey(
  privateKeyBase64: string,
  secretHex: string
): string {
  const key = Buffer.from(secretHex, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyBase64, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptPrivateKey(
  encryptedData: string,
  secretHex: string
): string {
  const [ivHex, encryptedHex] = encryptedData.split(":");
  const key = Buffer.from(secretHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return decipher.update(encrypted) + decipher.final("utf8");
}
