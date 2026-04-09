import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { validateSession } from "@/lib/auth";
import { validateBillInput } from "@/lib/validate";
import { sign, decryptPrivateKey } from "@/lib/crypto";
import { buildQrUrl, type BillPayload } from "@/lib/qr-payload";

function getSessionId(request: Request): string | undefined {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.split("=")[1];
}

export async function POST(request: Request) {
  const sessionIdValue = getSessionId(request);
  if (!sessionIdValue) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const issuer = await validateSession(sessionIdValue);
  if (!issuer) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateBillInput(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const input = validation.data;
  const billId = nanoid(8);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const secret = process.env.ENCRYPTION_SECRET || "0".repeat(64);
  const privateKey = decryptPrivateKey(issuer.encryptedPrivateKey, secret);

  const signableData: Record<string, unknown> = {
    v: 1,
    iss: issuer.name,
    sf: input.subtotalFood,
    sb: input.subtotalBeverage,
    st: input.subtotal,
    sc: input.serviceCharge,
    stx: input.serviceTax,
    lt: input.serviceTax,
    gt: input.grandTotal,
    bdt: input.billDateTime,
    pt: input.paymentType,
    vu: input.voucherUse,
    pub: issuer.publicKey,
  };
  if (input.guestName) signableData.gn = input.guestName;
  if (input.paidDateTime) signableData.pdt = input.paidDateTime;
  if (input.voucherCode) signableData.vc = input.voucherCode;
  if (input.marketplacePartner) signableData.mp = input.marketplacePartner;
  if (input.marketplaceReferenceCode) signableData.mrc = input.marketplaceReferenceCode;
  if (input.marketplaceBillDateTime) signableData.mbdt = input.marketplaceBillDateTime;

  const signature = await sign(signableData, privateKey);

  const bill = await prisma.bill.create({
    data: {
      id: billId,
      issuerId: issuer.id,
      guestName: input.guestName || null,
      subtotalFood: input.subtotalFood,
      subtotalBeverage: input.subtotalBeverage,
      subtotal: input.subtotal,
      serviceCharge: input.serviceCharge,
      serviceTax: input.serviceTax,
      grandTotal: input.grandTotal,
      billDateTime: new Date(input.billDateTime),
      paidDateTime: input.paidDateTime ? new Date(input.paidDateTime) : null,
      paymentType: input.paymentType,
      voucherUse: input.voucherUse,
      voucherCode: input.voucherCode || null,
      marketplacePartner: input.marketplacePartner || null,
      marketplaceReferenceCode: input.marketplaceReferenceCode || null,
      marketplaceBillDateTime: input.marketplaceBillDateTime
        ? new Date(input.marketplaceBillDateTime)
        : null,
      signature,
    },
  });

  const payload: BillPayload = {
    ...signableData,
    sig: signature,
  } as BillPayload;

  const qrUrl = buildQrUrl(billId, payload, appUrl);

  return NextResponse.json({ bill, qrUrl }, { status: 201 });
}

export async function GET(request: Request) {
  const sessionIdValue = getSessionId(request);
  if (!sessionIdValue) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const issuer = await validateSession(sessionIdValue);
  if (!issuer) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const bills = await prisma.bill.findMany({
    where: { issuerId: issuer.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bills });
}
