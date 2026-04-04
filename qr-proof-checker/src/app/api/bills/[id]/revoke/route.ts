import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSession } from "@/lib/auth";

function getSessionId(request: Request): string | undefined {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.split("=")[1];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionIdValue = getSessionId(request);
  if (!sessionIdValue) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const issuer = await validateSession(sessionIdValue);
  if (!issuer) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const bill = await prisma.bill.findFirst({
    where: { id, issuerId: issuer.id },
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const { reason } = await request.json();

  const updated = await prisma.bill.update({
    where: { id },
    data: { revoked: true, revokedAt: new Date() },
  });

  await prisma.revocationLog.create({
    data: { billId: id, reason: reason || "No reason provided" },
  });

  return NextResponse.json({ bill: updated });
}
