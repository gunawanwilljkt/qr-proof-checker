import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSession } from "@/lib/auth";
import { buildQrUrl, type BillPayload } from "@/lib/qr-payload";
import { generateQrDataUrl } from "@/lib/qr-generate";

function getSessionId(request: Request): string | undefined {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.split("=")[1];
}

export async function GET(
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

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const payload: BillPayload = {
    v: 1,
    iss: issuer.name,
    sf: bill.subtotalFood,
    sb: bill.subtotalBeverage,
    st: bill.subtotal,
    sc: bill.serviceCharge,
    vat: bill.vat,
    stx: bill.serviceTax,
    ctx: bill.cityTax,
    lt: bill.vat + bill.serviceTax + bill.cityTax,
    gt: bill.grandTotal,
    bdt: bill.billDateTime.toISOString(),
    pt: bill.paymentType,
    vu: bill.voucherUse,
    pub: issuer.publicKey,
    sig: bill.signature,
  };
  if (bill.guestName) payload.gn = bill.guestName;
  if (bill.paidDateTime) payload.pdt = bill.paidDateTime.toISOString();
  if (bill.voucherCode) payload.vc = bill.voucherCode;
  if (bill.marketplacePartner) payload.mp = bill.marketplacePartner;
  if (bill.marketplaceReferenceCode) payload.mrc = bill.marketplaceReferenceCode;
  if (bill.marketplaceBillDateTime)
    payload.mbdt = bill.marketplaceBillDateTime.toISOString();

  const qrUrl = buildQrUrl(id, payload, appUrl);
  const qrDataUrl = await generateQrDataUrl(qrUrl);

  return NextResponse.json({ qrUrl, qrDataUrl });
}
