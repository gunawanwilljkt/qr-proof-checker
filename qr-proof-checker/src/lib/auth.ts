import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "./db";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(issuerId: string): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: sessionId,
      issuerId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return sessionId;
}

export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { issuer: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return session.issuer;
}

export async function destroySession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
