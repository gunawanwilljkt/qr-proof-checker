import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateKeyPair, encryptPrivateKey } from "@/lib/crypto";
import { POST as createBill, GET as listBills } from "@/app/api/bills/route";
import { GET as getBill } from "@/app/api/bills/[id]/route";
import { POST as revokeBill } from "@/app/api/bills/[id]/revoke/route";
import { GET as getBillStatus } from "@/app/api/bills/[id]/status/route";

let sessionId: string;
let issuerId: string;

function makeRequest(
  body: unknown,
  opts?: { cookie?: string; method?: string }
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.cookie) headers["Cookie"] = opts.cookie;
  return new Request("http://localhost:3000/api/bills", {
    method: opts?.method || "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetRequest(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request("http://localhost:3000/api/bills", { headers });
}

const validBill = {
  guestName: "Jane Doe",
  subtotalFood: 150000,
  subtotalBeverage: 75000,
  subtotal: 225000,
  serviceCharge: 22500,
  localTax: 24750,
  grandTotal: 272250,
  billDateTime: "2026-04-04T19:30:00+07:00",
  paidDateTime: "2026-04-04T20:15:00+07:00",
  paymentType: "card",
  voucherUse: false,
};

describe("Bills API", () => {
  beforeEach(async () => {
    await prisma.revocationLog.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.issuer.deleteMany();

    const secret = process.env.ENCRYPTION_SECRET || "0".repeat(64);
    const { publicKey, privateKey } = await generateKeyPair();
    const encryptedPrivateKey = encryptPrivateKey(privateKey, secret);
    const passwordHash = await hashPassword("password");

    const issuer = await prisma.issuer.create({
      data: {
        name: "Test Hotel",
        email: "test@hotel.com",
        passwordHash,
        publicKey,
        encryptedPrivateKey,
      },
    });
    issuerId = issuer.id;

    const session = await prisma.session.create({
      data: {
        id: "test-session-id",
        issuerId: issuer.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    sessionId = session.id;
  });

  it("creates a bill and returns QR data", async () => {
    const res = await createBill(
      makeRequest(validBill, { cookie: `session=${sessionId}` })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.bill.id).toBeDefined();
    expect(body.bill.grandTotal).toBe(272250);
    expect(body.bill.signature).toBeDefined();
    expect(body.qrUrl).toContain(`/v/${body.bill.id}#`);
  });

  it("rejects unauthenticated bill creation", async () => {
    const res = await createBill(makeRequest(validBill));
    expect(res.status).toBe(401);
  });

  it("rejects invalid bill data", async () => {
    const res = await createBill(
      makeRequest(
        { ...validBill, subtotalFood: -1 },
        { cookie: `session=${sessionId}` }
      )
    );
    expect(res.status).toBe(400);
  });

  it("lists bills for the authenticated issuer", async () => {
    await createBill(
      makeRequest(validBill, { cookie: `session=${sessionId}` })
    );
    await createBill(
      makeRequest(validBill, { cookie: `session=${sessionId}` })
    );
    const res = await listBills(
      makeGetRequest(`session=${sessionId}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bills.length).toBe(2);
  });

  it("gets a single bill by id", async () => {
    const createRes = await createBill(
      makeRequest(validBill, { cookie: `session=${sessionId}` })
    );
    const { bill } = await createRes.json();

    const res = await getBill(
      makeGetRequest(`session=${sessionId}`),
      { params: Promise.resolve({ id: bill.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bill.id).toBe(bill.id);
  });

  it("revokes a bill", async () => {
    const createRes = await createBill(
      makeRequest(validBill, { cookie: `session=${sessionId}` })
    );
    const { bill } = await createRes.json();

    const res = await revokeBill(
      makeRequest({ reason: "Duplicate bill" }, { cookie: `session=${sessionId}` }),
      { params: Promise.resolve({ id: bill.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bill.revoked).toBe(true);
  });

  it("returns revocation status (public endpoint)", async () => {
    const createRes = await createBill(
      makeRequest(validBill, { cookie: `session=${sessionId}` })
    );
    const { bill } = await createRes.json();

    const res = await getBillStatus(
      new Request("http://localhost:3000"),
      { params: Promise.resolve({ id: bill.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toBe(false);
  });
});
