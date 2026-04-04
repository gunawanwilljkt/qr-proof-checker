import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateKeyPair, encryptPrivateKey } from "@/lib/crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email, and password are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.issuer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const { publicKey, privateKey } = await generateKeyPair();
  const secret = process.env.ENCRYPTION_SECRET || "0".repeat(64);
  const encryptedPrivateKey = encryptPrivateKey(privateKey, secret);

  const issuer = await prisma.issuer.create({
    data: { name, email, passwordHash, publicKey, encryptedPrivateKey },
  });

  return NextResponse.json(
    {
      issuer: {
        id: issuer.id,
        name: issuer.name,
        email: issuer.email,
        publicKey: issuer.publicKey,
      },
    },
    { status: 201 }
  );
}
