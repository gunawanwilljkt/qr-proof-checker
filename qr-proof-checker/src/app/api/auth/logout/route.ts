import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  const cookie = request.headers.get("Cookie") || "";
  const sessionId = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.split("=")[1];

  if (sessionId) {
    await destroySession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    "session=; HttpOnly; Path=/; Max-Age=0"
  );
  return response;
}
