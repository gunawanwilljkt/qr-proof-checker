# QR Bill Verification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where hotels/restaurants cryptographically sign bills and anyone can verify authenticity by scanning a QR code.

**Architecture:** Next.js full-stack app with SQLite/Prisma for storage. Ed25519 digital signatures enable offline verification — the QR encodes a short URL with the signed payload in the URL fragment. Issuers manage bills through a dashboard; verifiers scan QR codes from any phone camera.

**Tech Stack:** Next.js 14 (App Router), Prisma + SQLite, @noble/ed25519, nanoid, qrcode, html5-qrcode, bcrypt, Tailwind CSS

---

## File Structure

```
qr-proof-checker/
├── prisma/
│   └── schema.prisma                  # Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with Tailwind
│   │   ├── page.tsx                   # Landing page
│   │   ├── login/
│   │   │   └── page.tsx               # Issuer login
│   │   ├── register/
│   │   │   └── page.tsx               # Issuer registration
│   │   ├── verify/
│   │   │   └── page.tsx               # QR scanner + manual verify
│   │   ├── v/
│   │   │   └── [billId]/
│   │   │       └── page.tsx           # Short URL verify page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx             # Dashboard layout with auth guard
│   │   │   ├── page.tsx               # Bill list + stats
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # Create bill form
│   │   │   └── bills/
│   │   │       └── [id]/
│   │   │           └── page.tsx       # Bill detail + QR + revoke
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/
│   │   │   │   │   └── route.ts       # POST: register issuer
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts       # POST: login
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.ts       # POST: logout
│   │   │   │   └── me/
│   │   │   │       └── route.ts       # GET: current user
│   │   │   └── bills/
│   │   │       ├── route.ts           # GET: list bills, POST: create bill
│   │   │       └── [id]/
│   │   │           ├── route.ts       # GET: bill detail
│   │   │           ├── revoke/
│   │   │           │   └── route.ts   # POST: revoke bill
│   │   │           └── status/
│   │   │               └── route.ts   # GET: public revocation status
│   │   └── .well-known/
│   │       └── ed25519-keys/
│   │           └── [issuerId]/
│   │               └── route.ts       # GET: public key
│   ├── lib/
│   │   ├── db.ts                      # Prisma client singleton
│   │   ├── crypto.ts                  # Ed25519 sign/verify + key encryption
│   │   ├── qr-payload.ts             # Encode/decode QR payload
│   │   ├── qr-generate.ts            # Generate QR code image
│   │   ├── auth.ts                    # Session helpers (create, validate, destroy)
│   │   └── validate.ts               # Input validation for bill fields
│   └── components/
│       ├── qr-scanner.tsx             # Camera QR scanner component
│       ├── verification-result.tsx    # Displays verify result (valid/invalid/revoked)
│       ├── bill-form.tsx              # Bill creation form with conditional fields
│       ├── bill-table.tsx             # Bill list table for dashboard
│       └── nav.tsx                    # Navigation bar
├── tests/
│   ├── lib/
│   │   ├── crypto.test.ts            # Ed25519 sign/verify tests
│   │   ├── qr-payload.test.ts        # Payload encode/decode tests
│   │   ├── validate.test.ts          # Validation tests
│   │   └── auth.test.ts              # Session helper tests
│   └── api/
│       ├── auth.test.ts              # Auth endpoint tests
│       └── bills.test.ts             # Bill CRUD + revocation tests
├── .env.example                       # Environment variable template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── vitest.config.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/db.ts`, `prisma/schema.prisma`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/gunawanwilljkt/Documents/dev/qr-proof-checker
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the Next.js project with App Router, TypeScript, Tailwind, and ESLint.

- [ ] **Step 2: Install dependencies**

```bash
npm install @noble/ed25519 @prisma/client nanoid@3 qrcode bcrypt
npm install -D prisma vitest @vitejs/plugin-react jsdom @types/qrcode @types/bcrypt
```

Note: `nanoid@3` for CommonJS compatibility with Next.js server components.

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```
DATABASE_URL="file:./dev.db"
ENCRYPTION_SECRET="change-me-to-a-random-32-byte-hex-string"
APP_URL="http://localhost:3000"
```

Copy it to `.env`:

```bash
cp .env.example .env
```

- [ ] **Step 6: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Issuer {
  id                  String   @id @default(uuid())
  name                String
  email               String   @unique
  passwordHash        String
  publicKey           String
  encryptedPrivateKey String
  createdAt           DateTime @default(now())
  bills               Bill[]
  sessions            Session[]
}

model Bill {
  id                       String    @id
  issuerId                 String
  issuer                   Issuer    @relation(fields: [issuerId], references: [id])
  guestName                String?
  subtotalFood             Int
  subtotalBeverage         Int
  subtotal                 Int
  serviceCharge            Int
  localTax                 Int
  grandTotal               Int
  billDateTime             DateTime
  paidDateTime             DateTime?
  paymentType              String
  voucherUse               Boolean   @default(false)
  voucherCode              String?
  marketplacePartner       String?
  marketplaceReferenceCode String?
  marketplaceBillDateTime  DateTime?
  signature                String
  revoked                  Boolean   @default(false)
  revokedAt                DateTime?
  createdAt                DateTime  @default(now())
  revocationLogs           RevocationLog[]
}

model Session {
  id        String   @id
  issuerId  String
  issuer    Issuer   @relation(fields: [issuerId], references: [id])
  expiresAt DateTime
}

model RevocationLog {
  id        String   @id @default(uuid())
  billId    String
  bill      Bill     @relation(fields: [billId], references: [id])
  reason    String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 7: Generate Prisma client and push schema**

```bash
npx prisma generate
npx prisma db push
```

- [ ] **Step 8: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 9: Verify setup**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Prisma, Tailwind, Vitest"
```

---

### Task 2: Crypto Library (Ed25519 Sign/Verify + Key Encryption)

**Files:**
- Create: `src/lib/crypto.ts`
- Test: `tests/lib/crypto.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/crypto.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  sign,
  verify,
  encryptPrivateKey,
  decryptPrivateKey,
} from "@/lib/crypto";

describe("generateKeyPair", () => {
  it("returns base64-encoded public and private keys", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    expect(publicKey).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(privateKey).toMatch(/^[A-Za-z0-9+/=]+$/);
    // Ed25519 public key is 32 bytes, private key is 32 bytes seed
    expect(Buffer.from(publicKey, "base64").length).toBe(32);
    expect(Buffer.from(privateKey, "base64").length).toBe(32);
  });
});

describe("sign and verify", () => {
  it("produces a valid signature for a payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { name: "Test", amount: 100 };
    const signature = await sign(payload, privateKey);
    expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(Buffer.from(signature, "base64").length).toBe(64);
    const isValid = await verify(payload, signature, publicKey);
    expect(isValid).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload = { name: "Test", amount: 100 };
    const signature = await sign(payload, privateKey);
    const tampered = { name: "Test", amount: 999 };
    const isValid = await verify(tampered, signature, publicKey);
    expect(isValid).toBe(false);
  });

  it("rejects a signature from a different key", async () => {
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();
    const payload = { name: "Test" };
    const signature = await sign(payload, keyPair1.privateKey);
    const isValid = await verify(payload, signature, keyPair2.publicKey);
    expect(isValid).toBe(false);
  });

  it("canonicalizes payload (key order does not matter)", async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const payload1 = { b: 2, a: 1 };
    const payload2 = { a: 1, b: 2 };
    const signature = await sign(payload1, privateKey);
    const isValid = await verify(payload2, signature, publicKey);
    expect(isValid).toBe(true);
  });
});

describe("encryptPrivateKey and decryptPrivateKey", () => {
  it("round-trips a private key", () => {
    const secret = "a".repeat(64); // 32-byte hex string
    const privateKey = "dGVzdC1wcml2YXRlLWtleS1kYXRh"; // base64
    const encrypted = encryptPrivateKey(privateKey, secret);
    expect(encrypted).not.toBe(privateKey);
    const decrypted = decryptPrivateKey(encrypted, secret);
    expect(decrypted).toBe(privateKey);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const secret = "b".repeat(64);
    const privateKey = "dGVzdC1wcml2YXRlLWtleS1kYXRh";
    const encrypted1 = encryptPrivateKey(privateKey, secret);
    const encrypted2 = encryptPrivateKey(privateKey, secret);
    expect(encrypted1).not.toBe(encrypted2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/crypto.test.ts
```

Expected: FAIL — module `@/lib/crypto` not found.

- [ ] **Step 3: Implement crypto library**

Create `src/lib/crypto.ts`:

```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import crypto from "crypto";

// noble/ed25519 v2 requires setting the sha512 hash
ed.etc.sha512Sync = (...m) => {
  const h = sha512.create();
  m.forEach((msg) => h.update(msg));
  return h.digest();
};

function canonicalize(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return {
    publicKey: Buffer.from(publicKeyBytes).toString("base64"),
    privateKey: Buffer.from(privateKeyBytes).toString("base64"),
  };
}

export async function sign(
  payload: Record<string, unknown>,
  privateKeyBase64: string
): Promise<string> {
  const message = new TextEncoder().encode(canonicalize(payload));
  const privateKey = Buffer.from(privateKeyBase64, "base64");
  const signature = await ed.signAsync(message, privateKey);
  return Buffer.from(signature).toString("base64");
}

export async function verify(
  payload: Record<string, unknown>,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const message = new TextEncoder().encode(canonicalize(payload));
    const signature = Buffer.from(signatureBase64, "base64");
    const publicKey = Buffer.from(publicKeyBase64, "base64");
    return await ed.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}

export function encryptPrivateKey(
  privateKeyBase64: string,
  secretHex: string
): string {
  const key = Buffer.from(secretHex, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyBase64, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptPrivateKey(
  encryptedData: string,
  secretHex: string
): string {
  const [ivHex, encryptedHex] = encryptedData.split(":");
  const key = Buffer.from(secretHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

- [ ] **Step 4: Install noble hashes dependency**

```bash
npm install @noble/hashes
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/lib/crypto.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto.ts tests/lib/crypto.test.ts package.json package-lock.json
git commit -m "feat: add Ed25519 crypto library with key encryption"
```

---

### Task 3: QR Payload Encode/Decode

**Files:**
- Create: `src/lib/qr-payload.ts`
- Test: `tests/lib/qr-payload.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/qr-payload.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { encodePayload, decodePayload, type BillPayload } from "@/lib/qr-payload";

const samplePayload: BillPayload = {
  v: 1,
  iss: "Hotel Grand Jakarta",
  gn: "Jane Doe",
  sf: 150000,
  sb: 75000,
  st: 225000,
  sc: 22500,
  lt: 24750,
  gt: 272250,
  bdt: "2026-04-04T19:30:00+07:00",
  pdt: "2026-04-04T20:15:00+07:00",
  pt: "card",
  vu: true,
  vc: "SUMMER2026",
  mp: "GrabFood",
  mrc: "GRB-20260404-12345",
  mbdt: "2026-04-04T18:00:00+07:00",
  pub: "dGVzdHB1YmxpY2tleQ==",
  sig: "dGVzdHNpZ25hdHVyZQ==",
};

describe("encodePayload", () => {
  it("returns a base64url string", () => {
    const encoded = encodePayload(samplePayload);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("decodePayload", () => {
  it("round-trips a full payload", () => {
    const encoded = encodePayload(samplePayload);
    const decoded = decodePayload(encoded);
    expect(decoded).toEqual(samplePayload);
  });

  it("handles nullable fields (gn, pdt, vc, mp, mrc, mbdt absent)", () => {
    const minimal: BillPayload = {
      v: 1,
      iss: "Restaurant ABC",
      sf: 50000,
      sb: 0,
      st: 50000,
      sc: 5000,
      lt: 5500,
      gt: 60500,
      bdt: "2026-04-04T12:00:00+07:00",
      pt: "cash",
      vu: false,
      pub: "dGVzdA==",
      sig: "dGVzdA==",
    };
    const encoded = encodePayload(minimal);
    const decoded = decodePayload(encoded);
    expect(decoded).toEqual(minimal);
    expect(decoded.gn).toBeUndefined();
    expect(decoded.pdt).toBeUndefined();
    expect(decoded.vc).toBeUndefined();
    expect(decoded.mp).toBeUndefined();
    expect(decoded.mrc).toBeUndefined();
    expect(decoded.mbdt).toBeUndefined();
  });

  it("throws on invalid base64url", () => {
    expect(() => decodePayload("!!!invalid!!!")).toThrow();
  });
});

describe("buildQrUrl", () => {
  it("builds URL with fragment", async () => {
    const { buildQrUrl } = await import("@/lib/qr-payload");
    const url = buildQrUrl("abc12345", samplePayload, "https://app.com");
    expect(url).toMatch(/^https:\/\/app\.com\/v\/abc12345#/);
    const fragment = url.split("#")[1];
    const decoded = decodePayload(fragment);
    expect(decoded).toEqual(samplePayload);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/qr-payload.test.ts
```

Expected: FAIL — module `@/lib/qr-payload` not found.

- [ ] **Step 3: Implement QR payload module**

Create `src/lib/qr-payload.ts`:

```typescript
export interface BillPayload {
  v: number;
  iss: string;
  gn?: string;
  sf: number;
  sb: number;
  st: number;
  sc: number;
  lt: number;
  gt: number;
  bdt: string;
  pdt?: string;
  pt: string;
  vu: boolean;
  vc?: string;
  mp?: string;
  mrc?: string;
  mbdt?: string;
  pub: string;
  sig: string;
}

function toBase64Url(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return Buffer.from(b64, "base64").toString("utf8");
}

export function encodePayload(payload: BillPayload): string {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) clean[key] = value;
  }
  return toBase64Url(JSON.stringify(clean));
}

export function decodePayload(encoded: string): BillPayload {
  const json = fromBase64Url(encoded);
  const parsed = JSON.parse(json);
  if (typeof parsed.v !== "number" || typeof parsed.iss !== "string") {
    throw new Error("Invalid payload: missing required fields");
  }
  return parsed as BillPayload;
}

export function buildQrUrl(
  billId: string,
  payload: BillPayload,
  appUrl: string
): string {
  const encoded = encodePayload(payload);
  return `${appUrl}/v/${billId}#${encoded}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/qr-payload.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/qr-payload.ts tests/lib/qr-payload.test.ts
git commit -m "feat: add QR payload encode/decode with base64url"
```

---

### Task 4: Input Validation

**Files:**
- Create: `src/lib/validate.ts`
- Test: `tests/lib/validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/validate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateBillInput, type BillInput } from "@/lib/validate";

const validInput: BillInput = {
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
  voucherUse: true,
  voucherCode: "SUMMER2026",
  marketplacePartner: "GrabFood",
  marketplaceReferenceCode: "GRB-123",
  marketplaceBillDateTime: "2026-04-04T18:00:00+07:00",
};

describe("validateBillInput", () => {
  it("accepts valid full input", () => {
    const result = validateBillInput(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts input with nullable fields omitted", () => {
    const result = validateBillInput({
      subtotalFood: 50000,
      subtotalBeverage: 0,
      subtotal: 50000,
      serviceCharge: 5000,
      localTax: 5500,
      grandTotal: 60500,
      billDateTime: "2026-04-04T12:00:00+07:00",
      paymentType: "cash",
      voucherUse: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amounts", () => {
    const result = validateBillInput({ ...validInput, subtotalFood: -1 });
    expect(result.success).toBe(false);
    expect(result.error).toContain("subtotalFood");
  });

  it("rejects invalid payment type", () => {
    const result = validateBillInput({ ...validInput, paymentType: "bitcoin" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("paymentType");
  });

  it("rejects missing billDateTime", () => {
    const { billDateTime, ...rest } = validInput;
    const result = validateBillInput(rest as BillInput);
    expect(result.success).toBe(false);
    expect(result.error).toContain("billDateTime");
  });

  it("requires voucherCode when voucherUse is true", () => {
    const result = validateBillInput({
      ...validInput,
      voucherUse: true,
      voucherCode: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("voucherCode");
  });

  it("requires marketplaceReferenceCode when marketplacePartner is set", () => {
    const result = validateBillInput({
      ...validInput,
      marketplacePartner: "GrabFood",
      marketplaceReferenceCode: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("marketplaceReferenceCode");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/validate.test.ts
```

Expected: FAIL — module `@/lib/validate` not found.

- [ ] **Step 3: Implement validation**

Create `src/lib/validate.ts`:

```typescript
const PAYMENT_TYPES = ["cash", "card", "e-wallet", "transfer"] as const;

export interface BillInput {
  guestName?: string;
  subtotalFood: number;
  subtotalBeverage: number;
  subtotal: number;
  serviceCharge: number;
  localTax: number;
  grandTotal: number;
  billDateTime: string;
  paidDateTime?: string;
  paymentType: string;
  voucherUse: boolean;
  voucherCode?: string;
  marketplacePartner?: string;
  marketplaceReferenceCode?: string;
  marketplaceBillDateTime?: string;
}

type ValidationResult =
  | { success: true; data: BillInput }
  | { success: false; error: string };

export function validateBillInput(input: Partial<BillInput>): ValidationResult {
  const amountFields = [
    "subtotalFood",
    "subtotalBeverage",
    "subtotal",
    "serviceCharge",
    "localTax",
    "grandTotal",
  ] as const;

  for (const field of amountFields) {
    const value = input[field];
    if (typeof value !== "number" || value < 0) {
      return { success: false, error: `${field} must be a non-negative number` };
    }
  }

  if (!input.billDateTime || typeof input.billDateTime !== "string") {
    return { success: false, error: "billDateTime is required" };
  }

  if (
    !input.paymentType ||
    !PAYMENT_TYPES.includes(input.paymentType as (typeof PAYMENT_TYPES)[number])
  ) {
    return {
      success: false,
      error: `paymentType must be one of: ${PAYMENT_TYPES.join(", ")}`,
    };
  }

  if (typeof input.voucherUse !== "boolean") {
    return { success: false, error: "voucherUse must be a boolean" };
  }

  if (input.voucherUse && !input.voucherCode) {
    return {
      success: false,
      error: "voucherCode is required when voucherUse is true",
    };
  }

  if (input.marketplacePartner && !input.marketplaceReferenceCode) {
    return {
      success: false,
      error:
        "marketplaceReferenceCode is required when marketplacePartner is set",
    };
  }

  return { success: true, data: input as BillInput };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/validate.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validate.ts tests/lib/validate.test.ts
git commit -m "feat: add bill input validation"
```

---

### Task 5: Auth Library (Sessions + Password Hashing)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `tests/lib/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword, createSession, validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

describe("hashPassword and verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("my-secret-password");
    expect(hash).not.toBe("my-secret-password");
    expect(await verifyPassword("my-secret-password", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});

describe("createSession and validateSession", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.issuer.deleteMany();
    await prisma.issuer.create({
      data: {
        id: "test-issuer-id",
        name: "Test Hotel",
        email: "test@hotel.com",
        passwordHash: "dummy",
        publicKey: "dummy",
        encryptedPrivateKey: "dummy",
      },
    });
  });

  it("creates a session and validates it", async () => {
    const sessionId = await createSession("test-issuer-id");
    expect(typeof sessionId).toBe("string");
    const issuer = await validateSession(sessionId);
    expect(issuer).not.toBeNull();
    expect(issuer!.id).toBe("test-issuer-id");
  });

  it("returns null for invalid session id", async () => {
    const issuer = await validateSession("nonexistent");
    expect(issuer).toBeNull();
  });

  it("returns null for expired session", async () => {
    const sessionId = await createSession("test-issuer-id");
    // Manually expire the session
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const issuer = await validateSession(sessionId);
    expect(issuer).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/auth.test.ts
```

Expected: FAIL — module `@/lib/auth` not found.

- [ ] **Step 3: Implement auth library**

Create `src/lib/auth.ts`:

```typescript
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "./db";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(issuerId: string): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: sessionId,
      issuerId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return sessionId;
}

export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { issuer: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return session.issuer;
}

export async function destroySession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/auth.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add auth library with sessions and password hashing"
```

---

### Task 6: QR Code Generation

**Files:**
- Create: `src/lib/qr-generate.ts`

- [ ] **Step 1: Implement QR generation**

Create `src/lib/qr-generate.ts`:

```typescript
import QRCode from "qrcode";

export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  });
}

export async function generateQrBuffer(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/lib/qr-generate.ts 2>&1 || echo "Check for errors"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/qr-generate.ts
git commit -m "feat: add QR code generation utility"
```

---

### Task 7: Auth API Routes (Register, Login, Logout, Me)

**Files:**
- Create: `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`
- Test: `tests/api/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

const BASE = "http://localhost:3000";

// Test helper: direct function calls instead of HTTP to avoid needing a running server
// We test the route handler logic directly

import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as meHandler } from "@/app/api/auth/me/route";

function makeRequest(body: unknown, cookie?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers["Cookie"] = cookie;
  return new Request(`${BASE}/api/auth/test`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetRequest(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return new Request(`${BASE}/api/auth/me`, { headers });
}

describe("Auth API", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.issuer.deleteMany();
  });

  it("registers a new issuer", async () => {
    const res = await registerHandler(
      makeRequest({
        name: "Test Hotel",
        email: "test@hotel.com",
        password: "securepassword123",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.issuer.name).toBe("Test Hotel");
    expect(body.issuer.email).toBe("test@hotel.com");
    expect(body.issuer.publicKey).toBeDefined();
    // Should not leak sensitive fields
    expect(body.issuer.passwordHash).toBeUndefined();
    expect(body.issuer.encryptedPrivateKey).toBeUndefined();
  });

  it("rejects duplicate email", async () => {
    await registerHandler(
      makeRequest({
        name: "Hotel A",
        email: "dup@hotel.com",
        password: "password123",
      })
    );
    const res = await registerHandler(
      makeRequest({
        name: "Hotel B",
        email: "dup@hotel.com",
        password: "password456",
      })
    );
    expect(res.status).toBe(409);
  });

  it("logs in and returns session cookie", async () => {
    await registerHandler(
      makeRequest({
        name: "Test Hotel",
        email: "login@hotel.com",
        password: "securepassword123",
      })
    );
    const res = await loginHandler(
      makeRequest({ email: "login@hotel.com", password: "securepassword123" })
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("session=");
  });

  it("rejects wrong password", async () => {
    await registerHandler(
      makeRequest({
        name: "Test Hotel",
        email: "wrong@hotel.com",
        password: "correct",
      })
    );
    const res = await loginHandler(
      makeRequest({ email: "wrong@hotel.com", password: "incorrect" })
    );
    expect(res.status).toBe(401);
  });

  it("GET /me returns current user with valid session", async () => {
    await registerHandler(
      makeRequest({
        name: "Me Hotel",
        email: "me@hotel.com",
        password: "password123",
      })
    );
    const loginRes = await loginHandler(
      makeRequest({ email: "me@hotel.com", password: "password123" })
    );
    const setCookie = loginRes.headers.get("Set-Cookie")!;
    const sessionValue = setCookie.split("session=")[1].split(";")[0];

    const meRes = await meHandler(
      makeGetRequest(`session=${sessionValue}`)
    );
    expect(meRes.status).toBe(200);
    const body = await meRes.json();
    expect(body.issuer.email).toBe("me@hotel.com");
  });

  it("GET /me returns 401 without session", async () => {
    const res = await meHandler(makeGetRequest());
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/api/auth.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement register route**

Create `src/app/api/auth/register/route.ts`:

```typescript
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
```

- [ ] **Step 4: Implement login route**

Create `src/app/api/auth/login/route.ts`:

```typescript
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
```

- [ ] **Step 5: Implement logout route**

Create `src/app/api/auth/logout/route.ts`:

```typescript
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
```

- [ ] **Step 6: Implement me route**

Create `src/app/api/auth/me/route.ts`:

```typescript
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
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run tests/api/auth.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/auth/ tests/api/auth.test.ts
git commit -m "feat: add auth API routes (register, login, logout, me)"
```

---

### Task 8: Bills API Routes (Create, List, Detail, Revoke, Status)

**Files:**
- Create: `src/app/api/bills/route.ts`, `src/app/api/bills/[id]/route.ts`, `src/app/api/bills/[id]/revoke/route.ts`, `src/app/api/bills/[id]/status/route.ts`
- Test: `tests/api/bills.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api/bills.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/api/bills.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement bill creation and list route**

Create `src/app/api/bills/route.ts`:

```typescript
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

  // Build the signable payload (all bill fields + issuer info)
  const signableData: Record<string, unknown> = {
    v: 1,
    iss: issuer.name,
    sf: input.subtotalFood,
    sb: input.subtotalBeverage,
    st: input.subtotal,
    sc: input.serviceCharge,
    lt: input.localTax,
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
      localTax: input.localTax,
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
```

- [ ] **Step 4: Implement bill detail route**

Create `src/app/api/bills/[id]/route.ts`:

```typescript
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

  return NextResponse.json({ bill });
}
```

- [ ] **Step 5: Implement revoke route**

Create `src/app/api/bills/[id]/revoke/route.ts`:

```typescript
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
```

- [ ] **Step 6: Implement public status route**

Create `src/app/api/bills/[id]/status/route.ts`:

```typescript
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
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run tests/api/bills.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/bills/ tests/api/bills.test.ts
git commit -m "feat: add bills API routes (create, list, detail, revoke, status)"
```

---

### Task 9: Public Key Endpoint

**Files:**
- Create: `src/app/.well-known/ed25519-keys/[issuerId]/route.ts`

- [ ] **Step 1: Implement the route**

Create `src/app/.well-known/ed25519-keys/[issuerId]/route.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/.well-known/"
git commit -m "feat: add public key endpoint at .well-known"
```

---

### Task 10: Navigation Component

**Files:**
- Create: `src/components/nav.tsx`

- [ ] **Step 1: Implement navigation**

Create `src/components/nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.issuer) setUser(data.issuer);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">
          QR Proof Checker
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/verify"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Verify
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace the contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QR Proof Checker",
  description: "Verify hotel and restaurant bill authenticity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/nav.tsx src/app/layout.tsx
git commit -m "feat: add navigation component and update root layout"
```

---

### Task 11: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement landing page**

Replace the contents of `src/app/page.tsx` with:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-900">QR Proof Checker</h1>
      <p className="mt-4 max-w-lg text-lg text-gray-600">
        Verify the authenticity of hotel and restaurant bills instantly. Scan a
        QR code to confirm a bill is genuine, unaltered, and issued by a
        registered establishment.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/verify"
          className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Verify a Bill
        </Link>
        <Link
          href="/login"
          className="rounded border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50"
        >
          Sign In as Issuer
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add landing page"
```

---

### Task 12: Register and Login Pages

**Files:**
- Create: `src/app/register/page.tsx`, `src/app/login/page.tsx`

- [ ] **Step 1: Implement register page**

Create `src/app/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-6 text-2xl font-bold">Register as Issuer</h1>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Establishment Name
          </label>
          <input
            name="name"
            type="text"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already registered?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Implement login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-6 text-2xl font-bold">Sign In</h1>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        New here?{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/register/ src/app/login/
git commit -m "feat: add register and login pages"
```

---

### Task 13: Dashboard Layout and Bill List Page

**Files:**
- Create: `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `src/components/bill-table.tsx`

- [ ] **Step 1: Implement dashboard auth guard layout**

Create `src/app/dashboard/layout.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Implement bill table component**

Create `src/components/bill-table.tsx`:

```tsx
"use client";

import Link from "next/link";

interface Bill {
  id: string;
  guestName: string | null;
  grandTotal: number;
  paymentType: string;
  billDateTime: string;
  revoked: boolean;
  createdAt: string;
}

export default function BillTable({ bills }: { bills: Bill[] }) {
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (bills.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        No bills yet. Create your first bill.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-gray-600">
          <tr>
            <th className="py-3 pr-4">ID</th>
            <th className="py-3 pr-4">Guest</th>
            <th className="py-3 pr-4">Total</th>
            <th className="py-3 pr-4">Payment</th>
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id} className="border-b hover:bg-gray-50">
              <td className="py-3 pr-4">
                <Link
                  href={`/dashboard/bills/${bill.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {bill.id}
                </Link>
              </td>
              <td className="py-3 pr-4">{bill.guestName || "-"}</td>
              <td className="py-3 pr-4">{formatCurrency(bill.grandTotal)}</td>
              <td className="py-3 pr-4 capitalize">{bill.paymentType}</td>
              <td className="py-3 pr-4">{formatDate(bill.billDateTime)}</td>
              <td className="py-3 pr-4">
                {bill.revoked ? (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                    Revoked
                  </span>
                ) : (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                    Active
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Implement dashboard page**

Create `src/app/dashboard/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BillTable from "@/components/bill-table";

interface Bill {
  id: string;
  guestName: string | null;
  grandTotal: number;
  paymentType: string;
  billDateTime: string;
  revoked: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bills")
      .then((res) => res.json())
      .then((data) => {
        setBills(data.bills || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/dashboard/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Create Bill
        </Link>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading bills...</p>
      ) : (
        <BillTable bills={bills} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/dashboard/page.tsx src/components/bill-table.tsx
git commit -m "feat: add dashboard layout and bill list page"
```

---

### Task 14: Create Bill Form Page

**Files:**
- Create: `src/app/dashboard/new/page.tsx`, `src/components/bill-form.tsx`

- [ ] **Step 1: Implement bill form component**

Create `src/components/bill-form.tsx`:

```tsx
"use client";

import { useState } from "react";

interface BillFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading: boolean;
}

const PAYMENT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "e-wallet", label: "E-Wallet" },
  { value: "transfer", label: "Transfer" },
];

export default function BillForm({ onSubmit, loading }: BillFormProps) {
  const [voucherUse, setVoucherUse] = useState(false);
  const [hasMarketplace, setHasMarketplace] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const data: Record<string, unknown> = {
      guestName: form.get("guestName") || undefined,
      subtotalFood: Number(form.get("subtotalFood")),
      subtotalBeverage: Number(form.get("subtotalBeverage")),
      subtotal: Number(form.get("subtotal")),
      serviceCharge: Number(form.get("serviceCharge")),
      localTax: Number(form.get("localTax")),
      grandTotal: Number(form.get("grandTotal")),
      billDateTime: form.get("billDateTime") as string,
      paidDateTime: form.get("paidDateTime") || undefined,
      paymentType: form.get("paymentType") as string,
      voucherUse,
      voucherCode: voucherUse ? (form.get("voucherCode") as string) : undefined,
      marketplacePartner: hasMarketplace
        ? (form.get("marketplacePartner") as string)
        : undefined,
      marketplaceReferenceCode: hasMarketplace
        ? (form.get("marketplaceReferenceCode") as string)
        : undefined,
      marketplaceBillDateTime: hasMarketplace
        ? (form.get("marketplaceBillDateTime") as string)
        : undefined,
    };

    await onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Guest Name (optional)
        </label>
        <input
          name="guestName"
          type="text"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Subtotal Food
          </label>
          <input
            name="subtotalFood"
            type="number"
            min="0"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Subtotal Beverage
          </label>
          <input
            name="subtotalBeverage"
            type="number"
            min="0"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Subtotal
          </label>
          <input
            name="subtotal"
            type="number"
            min="0"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Service Charge
          </label>
          <input
            name="serviceCharge"
            type="number"
            min="0"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Local Tax
          </label>
          <input
            name="localTax"
            type="number"
            min="0"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Grand Total
          </label>
          <input
            name="grandTotal"
            type="number"
            min="0"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bill Date & Time
          </label>
          <input
            name="billDateTime"
            type="datetime-local"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Paid Date & Time (optional)
          </label>
          <input
            name="paidDateTime"
            type="datetime-local"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Payment Type
        </label>
        <select
          name="paymentType"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        >
          {PAYMENT_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {pt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={voucherUse}
            onChange={(e) => setVoucherUse(e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">
            Voucher Used
          </span>
        </label>
        {voucherUse && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Voucher Code
            </label>
            <input
              name="voucherCode"
              type="text"
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasMarketplace}
            onChange={(e) => setHasMarketplace(e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">
            Marketplace Order
          </span>
        </label>
        {hasMarketplace && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Marketplace Partner
              </label>
              <input
                name="marketplacePartner"
                type="text"
                required
                placeholder="e.g., GrabFood, GoFood, ShopeeFood"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Marketplace Reference Code
              </label>
              <input
                name="marketplaceReferenceCode"
                type="text"
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Marketplace Bill Date & Time
              </label>
              <input
                name="marketplaceBillDateTime"
                type="datetime-local"
                required
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Bill & Generate QR"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Implement create bill page**

Create `src/app/dashboard/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BillForm from "@/components/bill-form";

export default function NewBillPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: Record<string, unknown>) {
    setError("");
    setLoading(true);

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create bill");
      setLoading(false);
      return;
    }

    const { bill } = await res.json();
    router.push(`/dashboard/bills/${bill.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create New Bill</h1>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <BillForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/bill-form.tsx src/app/dashboard/new/
git commit -m "feat: add create bill form page"
```

---

### Task 15: Bill Detail Page (QR Display + Revoke)

**Files:**
- Create: `src/app/dashboard/bills/[id]/page.tsx`

- [ ] **Step 1: Implement bill detail page**

Create `src/app/dashboard/bills/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface BillDetail {
  id: string;
  guestName: string | null;
  subtotalFood: number;
  subtotalBeverage: number;
  subtotal: number;
  serviceCharge: number;
  localTax: number;
  grandTotal: number;
  billDateTime: string;
  paidDateTime: string | null;
  paymentType: string;
  voucherUse: boolean;
  voucherCode: string | null;
  marketplacePartner: string | null;
  marketplaceReferenceCode: string | null;
  marketplaceBillDateTime: string | null;
  revoked: boolean;
  revokedAt: string | null;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("id-ID");
}

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  useEffect(() => {
    const billId = params.id as string;
    Promise.all([
      fetch(`/api/bills/${billId}`).then((r) => r.json()),
      fetch(`/api/bills/${billId}/qr`).then((r) => r.json()).catch(() => null),
    ]).then(([billData, qrData]) => {
      setBill(billData.bill || null);
      if (qrData?.qrDataUrl) setQrDataUrl(qrData.qrDataUrl);
      setLoading(false);
    });
  }, [params.id]);

  async function handleRevoke() {
    if (!confirm("Are you sure you want to revoke this bill?")) return;
    setRevoking(true);
    const res = await fetch(`/api/bills/${params.id}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: revokeReason }),
    });
    if (res.ok) {
      const data = await res.json();
      setBill(data.bill);
    }
    setRevoking(false);
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!bill) return <p className="text-red-600">Bill not found</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Bill {bill.id}</h1>

      {bill.revoked && (
        <div className="mb-6 rounded bg-red-50 p-4 text-red-700">
          This bill has been revoked
          {bill.revokedAt && ` on ${formatDate(bill.revokedAt)}`}.
        </div>
      )}

      {qrDataUrl && (
        <div className="mb-6 text-center">
          <img src={qrDataUrl} alt="QR Code" className="mx-auto" />
          <a
            href={qrDataUrl}
            download={`bill-${bill.id}-qr.png`}
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Download QR Code
          </a>
        </div>
      )}

      <div className="space-y-3 rounded border p-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-600">Guest:</span>
          <span>{bill.guestName || "-"}</span>
          <span className="text-gray-600">Subtotal Food:</span>
          <span>{formatCurrency(bill.subtotalFood)}</span>
          <span className="text-gray-600">Subtotal Beverage:</span>
          <span>{formatCurrency(bill.subtotalBeverage)}</span>
          <span className="text-gray-600">Subtotal:</span>
          <span>{formatCurrency(bill.subtotal)}</span>
          <span className="text-gray-600">Service Charge:</span>
          <span>{formatCurrency(bill.serviceCharge)}</span>
          <span className="text-gray-600">Local Tax:</span>
          <span>{formatCurrency(bill.localTax)}</span>
          <span className="text-gray-600 font-bold">Grand Total:</span>
          <span className="font-bold">{formatCurrency(bill.grandTotal)}</span>
          <span className="text-gray-600">Bill Date:</span>
          <span>{formatDate(bill.billDateTime)}</span>
          {bill.paidDateTime && (
            <>
              <span className="text-gray-600">Paid Date:</span>
              <span>{formatDate(bill.paidDateTime)}</span>
            </>
          )}
          <span className="text-gray-600">Payment Type:</span>
          <span className="capitalize">{bill.paymentType}</span>
          {bill.voucherUse && (
            <>
              <span className="text-gray-600">Voucher Code:</span>
              <span>{bill.voucherCode}</span>
            </>
          )}
          {bill.marketplacePartner && (
            <>
              <span className="text-gray-600">Marketplace:</span>
              <span>{bill.marketplacePartner}</span>
              <span className="text-gray-600">Marketplace Ref:</span>
              <span>{bill.marketplaceReferenceCode}</span>
              {bill.marketplaceBillDateTime && (
                <>
                  <span className="text-gray-600">Marketplace Date:</span>
                  <span>{formatDate(bill.marketplaceBillDateTime)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!bill.revoked && (
        <div className="mt-6 rounded border border-red-200 p-4">
          <h3 className="mb-2 font-medium text-red-700">Revoke this bill</h3>
          <input
            type="text"
            placeholder="Reason for revocation"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {revoking ? "Revoking..." : "Revoke Bill"}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add QR generation API endpoint**

Create `src/app/api/bills/[id]/qr/route.ts`:

```typescript
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
    lt: bill.localTax,
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/bills/ src/app/api/bills/[id]/qr/
git commit -m "feat: add bill detail page with QR display and revoke"
```

---

### Task 16: Verification Result Component

**Files:**
- Create: `src/components/verification-result.tsx`

- [ ] **Step 1: Implement verification result component**

Create `src/components/verification-result.tsx`:

```tsx
"use client";

interface VerificationResultProps {
  status: "valid" | "invalid" | "revoked" | null;
  billData?: {
    iss: string;
    gn?: string;
    sf: number;
    sb: number;
    st: number;
    sc: number;
    lt: number;
    gt: number;
    bdt: string;
    pdt?: string;
    pt: string;
    vu: boolean;
    vc?: string;
    mp?: string;
    mrc?: string;
    mbdt?: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("id-ID");
}

export default function VerificationResult({
  status,
  billData,
}: VerificationResultProps) {
  if (!status) return null;

  return (
    <div className="mt-6">
      {status === "valid" && (
        <div className="rounded border-2 border-green-500 bg-green-50 p-6">
          <h2 className="mb-2 text-xl font-bold text-green-700">
            Bill Verified
          </h2>
          <p className="mb-4 text-sm text-green-600">
            This bill is authentic and has not been tampered with.
          </p>
        </div>
      )}

      {status === "invalid" && (
        <div className="rounded border-2 border-red-500 bg-red-50 p-6">
          <h2 className="text-xl font-bold text-red-700">
            Verification Failed
          </h2>
          <p className="mt-2 text-sm text-red-600">
            This bill could not be verified. It may have been tampered with or
            is not authentic.
          </p>
        </div>
      )}

      {status === "revoked" && (
        <div className="rounded border-2 border-yellow-500 bg-yellow-50 p-6">
          <h2 className="text-xl font-bold text-yellow-700">Bill Revoked</h2>
          <p className="mt-2 text-sm text-yellow-600">
            The signature is valid, but the issuer has revoked this bill.
          </p>
        </div>
      )}

      {billData && status !== "invalid" && (
        <div className="mt-4 rounded border p-4">
          <h3 className="mb-3 font-medium text-gray-900">Bill Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600">Issued by:</span>
            <span className="font-medium">{billData.iss}</span>
            {billData.gn && (
              <>
                <span className="text-gray-600">Guest:</span>
                <span>{billData.gn}</span>
              </>
            )}
            <span className="text-gray-600">Subtotal Food:</span>
            <span>{formatCurrency(billData.sf)}</span>
            <span className="text-gray-600">Subtotal Beverage:</span>
            <span>{formatCurrency(billData.sb)}</span>
            <span className="text-gray-600">Subtotal:</span>
            <span>{formatCurrency(billData.st)}</span>
            <span className="text-gray-600">Service Charge:</span>
            <span>{formatCurrency(billData.sc)}</span>
            <span className="text-gray-600">Local Tax:</span>
            <span>{formatCurrency(billData.lt)}</span>
            <span className="text-gray-600 font-bold">Grand Total:</span>
            <span className="font-bold">{formatCurrency(billData.gt)}</span>
            <span className="text-gray-600">Bill Date:</span>
            <span>{formatDate(billData.bdt)}</span>
            {billData.pdt && (
              <>
                <span className="text-gray-600">Paid Date:</span>
                <span>{formatDate(billData.pdt)}</span>
              </>
            )}
            <span className="text-gray-600">Payment:</span>
            <span className="capitalize">{billData.pt}</span>
            {billData.vu && billData.vc && (
              <>
                <span className="text-gray-600">Voucher:</span>
                <span>{billData.vc}</span>
              </>
            )}
            {billData.mp && (
              <>
                <span className="text-gray-600">Marketplace:</span>
                <span>{billData.mp}</span>
                {billData.mrc && (
                  <>
                    <span className="text-gray-600">Marketplace Ref:</span>
                    <span>{billData.mrc}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/verification-result.tsx
git commit -m "feat: add verification result display component"
```

---

### Task 17: QR Scanner Component

**Files:**
- Create: `src/components/qr-scanner.tsx`

- [ ] **Step 1: Install html5-qrcode**

```bash
npm install html5-qrcode
```

- [ ] **Step 2: Implement QR scanner component**

Create `src/components/qr-scanner.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (data: string) => void;
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!scanning || !scannerRef.current) return;

    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("qr-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            scanner?.stop().catch(() => {});
            setScanning(false);
          },
          () => {}
        );
      } catch (err) {
        setError("Could not access camera. Please upload a QR image instead.");
        setScanning(false);
      }
    })();

    return () => {
      scanner?.stop().catch(() => {});
    };
  }, [scanning, onScan]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-file-reader");
    try {
      const result = await scanner.scanFile(file, true);
      onScan(result);
    } catch {
      setError("Could not read QR code from image.");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => {
            setError(null);
            setScanning(!scanning);
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {scanning ? "Stop Camera" : "Scan with Camera"}
        </button>
        <label className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Upload QR Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {scanning && (
        <div
          id="qr-reader"
          ref={scannerRef}
          className="mx-auto max-w-sm"
        />
      )}
      <div id="qr-file-reader" className="hidden" />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/qr-scanner.tsx package.json package-lock.json
git commit -m "feat: add QR scanner component with camera and file upload"
```

---

### Task 18: Verify Page

**Files:**
- Create: `src/app/verify/page.tsx`

- [ ] **Step 1: Implement verify page**

Create `src/app/verify/page.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import QrScanner from "@/components/qr-scanner";
import VerificationResult from "@/components/verification-result";

export default function VerifyPage() {
  const [status, setStatus] = useState<"valid" | "invalid" | "revoked" | null>(
    null
  );
  const [billData, setBillData] = useState<Record<string, unknown> | undefined>(
    undefined
  );
  const [manualInput, setManualInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const processQrData = useCallback(async (data: string) => {
    setVerifying(true);
    setStatus(null);
    setBillData(undefined);

    try {
      // Extract fragment from URL or treat as raw payload
      let encodedPayload: string;
      if (data.includes("#")) {
        encodedPayload = data.split("#")[1];
      } else {
        encodedPayload = data;
      }

      // Dynamically import to keep client bundle small
      const { decodePayload } = await import("@/lib/qr-payload");
      const { verify } = await import("@/lib/crypto");

      const payload = decodePayload(encodedPayload);
      const { sig, ...dataWithoutSig } = payload;

      const isValid = await verify(dataWithoutSig, sig, payload.pub);

      if (!isValid) {
        setStatus("invalid");
        setVerifying(false);
        return;
      }

      // Check revocation status online if URL contains a bill ID
      const billIdMatch = data.match(/\/v\/([^#]+)/);
      if (billIdMatch) {
        try {
          const res = await fetch(`/api/bills/${billIdMatch[1]}/status`);
          if (res.ok) {
            const statusData = await res.json();
            if (statusData.revoked) {
              setStatus("revoked");
              setBillData(dataWithoutSig as Record<string, unknown>);
              setVerifying(false);
              return;
            }
          }
        } catch {
          // Offline — skip revocation check
        }
      }

      setStatus("valid");
      setBillData(dataWithoutSig as Record<string, unknown>);
    } catch {
      setStatus("invalid");
    }

    setVerifying(false);
  }, []);

  function handleManualVerify() {
    if (manualInput.trim()) {
      processQrData(manualInput.trim());
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Verify a Bill</h1>
      <p className="mb-6 text-sm text-gray-600">
        Scan a QR code from a bill to verify its authenticity. You can use your
        camera, upload an image, or paste the QR data directly.
      </p>

      <QrScanner onScan={processQrData} />

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700">
          Or paste QR data / verification URL
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Paste URL or payload..."
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleManualVerify}
            disabled={verifying}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>

      <VerificationResult
        status={status}
        billData={billData as VerificationResult["billData"]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/verify/
git commit -m "feat: add verify page with QR scanning and manual input"
```

---

### Task 19: Short URL Verification Page

**Files:**
- Create: `src/app/v/[billId]/page.tsx`

- [ ] **Step 1: Implement short URL page**

Create `src/app/v/[billId]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import VerificationResult from "@/components/verification-result";

export default function ShortVerifyPage() {
  const params = useParams();
  const [status, setStatus] = useState<"valid" | "invalid" | "revoked" | null>(
    null
  );
  const [billData, setBillData] = useState<Record<string, unknown> | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyFromFragment() {
      const fragment = window.location.hash.slice(1);
      if (!fragment) {
        setStatus("invalid");
        setLoading(false);
        return;
      }

      try {
        const { decodePayload } = await import("@/lib/qr-payload");
        const { verify } = await import("@/lib/crypto");

        const payload = decodePayload(fragment);
        const { sig, ...dataWithoutSig } = payload;

        const isValid = await verify(dataWithoutSig, sig, payload.pub);

        if (!isValid) {
          setStatus("invalid");
          setLoading(false);
          return;
        }

        // Check revocation
        try {
          const res = await fetch(`/api/bills/${params.billId}/status`);
          if (res.ok) {
            const statusData = await res.json();
            if (statusData.revoked) {
              setStatus("revoked");
              setBillData(dataWithoutSig as Record<string, unknown>);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Offline — skip revocation check
        }

        setStatus("valid");
        setBillData(dataWithoutSig as Record<string, unknown>);
      } catch {
        setStatus("invalid");
      }

      setLoading(false);
    }

    verifyFromFragment();
  }, [params.billId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-gray-500">Verifying bill...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Bill Verification</h1>
      <VerificationResult
        status={status}
        billData={billData as VerificationResult["billData"]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/v/
git commit -m "feat: add short URL verification page"
```

---

### Task 20: Final Integration Verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Verify in browser:
1. Register a new issuer at `/register`
2. Log in at `/login`
3. Create a bill at `/dashboard/new`
4. View bill detail and see QR code at `/dashboard/bills/<id>`
5. Open the QR code's URL (or scan it) to verify at `/v/<id>`
6. Revoke the bill and verify it shows as revoked

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration issues from smoke test"
```

(Only if fixes are needed.)
