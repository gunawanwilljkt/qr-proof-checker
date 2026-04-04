import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id },
    select: { id: true, revoked: true, revokedAt: true },
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: bill.id,
    revoked: bill.revoked,
    revokedAt: bill.revokedAt,
  });
}
