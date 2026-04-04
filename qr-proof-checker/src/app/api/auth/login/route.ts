import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  const issuer = await prisma.issuer.findUnique({ where: { email } });
  if (!issuer) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, issuer.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionId = await createSession(issuer.id);

  const response = NextResponse.json({
    issuer: { id: issuer.id, name: issuer.name, email: issuer.email },
  });
  response.headers.set(
    "Set-Cookie",
    `session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
  );
  return response;
}
