# QR Bill Verification System — Design Spec

## Problem

Hotels and restaurants need a way to prove that bills/receipts are authentic and untampered. Guests, auditors, or any third party should be able to verify a bill's authenticity by scanning a QR code — no special app required.

## Solution

A web application where establishments (issuers) cryptographically sign bills and generate QR codes. Anyone (verifier) can scan the QR to verify the bill is genuine. Verification works offline via digital signatures, with optional online revocation checking.

## Tech Stack

- **Framework:** Next.js (React frontend + API routes)
- **Database:** SQLite via Prisma
- **Crypto:** Ed25519 (via `@noble/ed25519` or Node.js crypto)
- **QR Generation:** `qrcode` library
- **QR Scanning:** `html5-qrcode` or similar browser-based scanner

## Architecture

### Three Flows

1. **Issuer flow** — Authenticated issuer fills in bill details. The server signs the data with the issuer's Ed25519 private key, generates a QR code containing a short verification URL, and stores the bill record. The issuer downloads or prints the QR.

2. **Verifier flow** — Anyone scans the QR code with their phone camera. The short URL (e.g., `https://app.com/v/<billId>`) opens the verify page, which verifies the signature client-side and checks revocation status online. Users can also upload a QR image or paste a payload manually.

3. **Admin flow** — Issuer can view issued bills, revoke them (with reason), and manage their account/keypair.

### QR Payload Format

The QR code encodes a short URL: `https://app.com/v/<billId>#<base64url-payload>`

The payload (in the URL fragment) is a Base64URL-encoded JSON:

```json
{
  "v": 1,
  "iss": "Hotel Grand Jakarta",
  "gn": "Jane Doe",
  "sf": 150000,
  "sb": 75000,
  "st": 225000,
  "sc": 22500,
  "lt": 24750,
  "gt": 272250,
  "bdt": "2026-04-04T19:30:00+07:00",
  "pdt": "2026-04-04T20:15:00+07:00",
  "pt": "card",
  "vu": true,
  "vc": "SUMMER2026",
  "mp": "GrabFood",
  "mrc": "GRB-20260404-12345",
  "mbdt": "2026-04-04T18:00:00+07:00",
  "pub": "<Ed25519 public key, 32 bytes base64>",
  "sig": "<Ed25519 signature, 64 bytes base64>"
}
```

**Field key mapping:**
| Key   | Full Name                  |
|-------|----------------------------|
| v     | version                    |
| iss   | issuer name                |
| gn    | guest name (nullable)      |
| sf    | subtotal food              |
| sb    | subtotal beverage          |
| st    | subtotal                   |
| sc    | service charge             |
| lt    | local tax                  |
| gt    | grand total                |
| bdt   | bill date time             |
| pdt   | paid date time (nullable)  |
| pt    | payment type               |
| vu    | voucher use                |
| vc    | voucher code (nullable)    |
| mp    | marketplace partner (nullable) |
| mrc   | marketplace reference code (nullable) |
| mbdt  | marketplace bill date time (nullable) |
| pub   | public key                 |
| sig   | signature                  |

Short keys minimize QR payload size. The signature covers all fields except `sig`, canonicalized (sorted keys, no whitespace).

### Signature Verification

1. Extract all fields except `sig` from the payload
2. Canonicalize: JSON.stringify with sorted keys, no whitespace
3. Verify the Ed25519 signature using the embedded `pub` key
4. If online: also check `GET /api/bills/<billId>/status` for revocation

Verification is fully self-contained in the browser — no server call needed for core authenticity checking.

## Data Model

### Issuer

| Column              | Type      | Notes                          |
|---------------------|-----------|--------------------------------|
| id                  | UUID      | Primary key                    |
| name                | String    | Establishment name             |
| email               | String    | Unique                         |
| passwordHash        | String    |                                |
| publicKey           | String    | Ed25519 public key, base64     |
| encryptedPrivateKey | String    | Encrypted at rest              |
| createdAt           | DateTime  |                                |

### Bill

| Column                   | Type      | Notes                              |
|--------------------------|-----------|------------------------------------|
| id                       | String    | 8-char nanoid, primary key         |
| issuerId                 | UUID      | FK -> Issuer                       |
| guestName                | String?   | Nullable                           |
| subtotalFood             | Int       | Smallest currency unit             |
| subtotalBeverage         | Int       | Smallest currency unit             |
| subtotal                 | Int       | Smallest currency unit             |
| serviceCharge            | Int       | Smallest currency unit             |
| localTax                 | Int       | Smallest currency unit             |
| grandTotal               | Int       | Smallest currency unit             |
| billDateTime             | DateTime  |                                    |
| paidDateTime             | DateTime? | Nullable                           |
| paymentType              | String    | cash, card, e-wallet, transfer     |
| voucherUse               | Boolean   | Default false                      |
| voucherCode              | String?   | Nullable                           |
| marketplacePartner       | String?   | Nullable (GrabFood, GoFood, etc.)  |
| marketplaceReferenceCode | String?   | Nullable                           |
| marketplaceBillDateTime  | DateTime? | Nullable                           |
| signature                | String    | Ed25519 signature, base64          |
| revoked                  | Boolean   | Default false                      |
| revokedAt                | DateTime? | Nullable                           |
| createdAt                | DateTime  |                                    |

### Session

| Column    | Type     | Notes         |
|-----------|----------|---------------|
| id        | String   | Primary key   |
| issuerId  | UUID     | FK -> Issuer  |
| expiresAt | DateTime |               |

### RevocationLog

| Column        | Type     | Notes        |
|---------------|----------|--------------|
| id            | UUID     | Primary key  |
| billId        | String   | FK -> Bill   |
| reason        | String   |              |
| createdAt     | DateTime |              |

Amounts stored as integers in the smallest currency unit (e.g., rupiah) to avoid floating-point issues.

## Key Management

- Ed25519 keypairs generated server-side during issuer registration
- Private key encrypted with a server-side secret (from environment variable) before storage
- Public key published at `/.well-known/ed25519-keys/<issuerId>` for independent verification
- Key rotation: generate new keypair, old bills remain verifiable via embedded `pub` in QR

## Pages

1. **`/`** — Landing page with brief explanation and "Verify" / "Sign In" buttons
2. **`/verify`** — QR scanner + manual input, shows verification result (valid/invalid/revoked)
3. **`/v/<billId>`** — Short URL target, auto-verifies from URL fragment payload
4. **`/login`** — Issuer login
5. **`/register`** — Issuer registration
6. **`/dashboard`** — List of issued bills, stats
7. **`/dashboard/new`** — Create new bill form (conditional fields for voucher/marketplace)
8. **`/dashboard/bills/<id>`** — Bill detail, QR download, revoke action

## Security Considerations

- Private keys encrypted at rest, never sent to the client
- Passwords hashed with bcrypt
- Session-based auth with HTTP-only cookies
- Rate limiting on auth endpoints
- Input validation on all bill fields
- CSRF protection via Next.js defaults
- QR payload is in URL fragment (not sent to server in HTTP requests)

## Out of Scope (for now)

- Multi-currency support (single currency assumed)
- Bulk bill import/CSV upload
- API keys for POS system integration
- Email notifications
- Multi-user per establishment
