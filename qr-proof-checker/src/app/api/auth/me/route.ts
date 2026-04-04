import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";

export async function GET(request: Request) {
  const cookie = request.headers.get("Cookie") || "";
  const sessionId = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.split("=")[1];

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const issuer = await validateSession(sessionId);
  if (!issuer) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  return NextResponse.json({
    issuer: {
      id: issuer.id,
      name: issuer.name,
      email: issuer.email,
      publicKey: issuer.publicKey,
    },
  });
}
