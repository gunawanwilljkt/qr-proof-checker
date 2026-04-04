import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword, createSession, validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

describe("hashPassword and verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("my-secret-password");
    expect(hash).not.toBe("my-secret-password");
    expect(await verifyPassword("my-secret-password", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});

describe("createSession and validateSession", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.issuer.deleteMany();
    await prisma.issuer.create({
      data: {
        id: "test-issuer-id",
        name: "Test Hotel",
        email: "test@hotel.com",
        passwordHash: "dummy",
        publicKey: "dummy",
        encryptedPrivateKey: "dummy",
      },
    });
  });

  it("creates a session and validates it", async () => {
    const sessionId = await createSession("test-issuer-id");
    expect(typeof sessionId).toBe("string");
    const issuer = await validateSession(sessionId);
    expect(issuer).not.toBeNull();
    expect(issuer!.id).toBe("test-issuer-id");
  });

  it("returns null for invalid session id", async () => {
    const issuer = await validateSession("nonexistent");
    expect(issuer).toBeNull();
  });

  it("returns null for expired session", async () => {
    const sessionId = await createSession("test-issuer-id");
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const issuer = await validateSession(sessionId);
    expect(issuer).toBeNull();
  });
});
