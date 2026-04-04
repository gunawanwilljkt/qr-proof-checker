import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ issuerId: string }> }
) {
  const { issuerId } = await params;
  const issuer = await prisma.issuer.findUnique({
    where: { id: issuerId },
    select: { id: true, name: true, publicKey: true },
  });

  if (!issuer) {
    return NextResponse.json({ error: "Issuer not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: issuer.id,
    name: issuer.name,
    publicKey: issuer.publicKey,
  });
}
