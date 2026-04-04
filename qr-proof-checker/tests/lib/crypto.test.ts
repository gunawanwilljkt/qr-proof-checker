import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  sign,
  verify,
  encryptPrivateKey,
  decryptPrivateKey,
} from "@/lib/crypto";

describe("generateKeyPair", () => {
  it("returns base64-encoded public and private keys", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    expect(publicKey).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(privateKey).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(Buffer.from(publicKey, "base64").length).toBe(32);
    expect(Buffer.from(privateKey, "base64").length).toBe(32);
  });
});

describe("sign and verify", () => {
  it("produces a valid signature for a payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { name: "Test", amount: 100 };
    const signature = await sign(payload, privateKey);
    expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(Buffer.from(signature, "base64").length).toBe(64);
    const isValid = await verify(payload, signature, publicKey);
    expect(isValid).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { name: "Test", amount: 100 };
    const signature = await sign(payload, privateKey);
    const tampered = { name: "Test", amount: 999 };
    const isValid = await verify(tampered, signature, publicKey);
    expect(isValid).toBe(false);
  });

  it("rejects a signature from a different key", async () => {
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();
    const payload = { name: "Test" };
    const signature = await sign(payload, keyPair1.privateKey);
    const isValid = await verify(payload, signature, keyPair2.publicKey);
    expect(isValid).toBe(false);
  });

  it("canonicalizes payload (key order does not matter)", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload1 = { b: 2, a: 1 };
    const payload2 = { a: 1, b: 2 };
    const signature = await sign(payload1, privateKey);
    const isValid = await verify(payload2, signature, publicKey);
    expect(isValid).toBe(true);
  });
});

describe("encryptPrivateKey and decryptPrivateKey", () => {
  it("round-trips a private key", () => {
    const secret = "a".repeat(64);
    const privateKey = "dGVzdC1wcml2YXRlLWtleS1kYXRh";
    const encrypted = encryptPrivateKey(privateKey, secret);
    expect(encrypted).not.toBe(privateKey);
    const decrypted = decryptPrivateKey(encrypted, secret);
    expect(decrypted).toBe(privateKey);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const secret = "b".repeat(64);
    const privateKey = "dGVzdC1wcml2YXRlLWtleS1kYXRh";
    const encrypted1 = encryptPrivateKey(privateKey, secret);
    const encrypted2 = encryptPrivateKey(privateKey, secret);
    expect(encrypted1).not.toBe(encrypted2);
  });
});
