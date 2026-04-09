import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.etc.sha512Sync = (...m) => {
  const h = sha512.create();
  m.forEach((msg) => h.update(msg));
  return h.digest();
};

const prisma = new PrismaClient();

function encryptPrivateKey(privateKeyBase64: string, secretHex: string): string {
  const key = Buffer.from(secretHex, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyBase64, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function canonicalize(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

async function signPayload(
  payload: Record<string, unknown>,
  privateKeyBase64: string
): Promise<string> {
  const message = new TextEncoder().encode(canonicalize(payload));
  const privateKey = Buffer.from(privateKeyBase64, "base64");
  const signature = await ed.signAsync(message, privateKey);
  return Buffer.from(signature).toString("base64");
}

const GUEST_NAMES = [
  "Budi Santoso", "Siti Rahayu", "Ahmad Wijaya", "Dewi Lestari",
  "Eko Prasetyo", "Rina Wulandari", "Agus Setiawan", "Maya Putri",
  "Hendra Gunawan", "Fitri Handayani", "Joko Susanto", "Ani Kartika",
  "Rudi Hartono", "Yuni Astuti", "Dian Permata", "Bambang Suryadi",
  "Lina Kusuma", "Fajar Nugroho", "Wati Sulistyo", "Arief Rahman",
  null, null, null, null, null,
];

const PAYMENT_TYPES = ["cash", "card", "e-wallet", "transfer"];

const VOUCHER_CODES = ["WELCOME10", "LOYALTY20", "WEEKEND15", "NEWYEAR25"];

const MARKETPLACE_PARTNERS = ["GrabFood", "GoFood", "ShopeeFood"];

const secret = "0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
  // Clean existing data
  await prisma.revocationLog.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.session.deleteMany();
  await prisma.issuer.deleteMany();

  // Generate keypairs
  const hotelPrivKeyBytes = ed.utils.randomPrivateKey();
  const hotelPubKeyBytes = await ed.getPublicKeyAsync(hotelPrivKeyBytes);
  const hotelPrivKey = Buffer.from(hotelPrivKeyBytes).toString("base64");
  const hotelPubKey = Buffer.from(hotelPubKeyBytes).toString("base64");

  const restoPrivKeyBytes = ed.utils.randomPrivateKey();
  const restoPubKeyBytes = await ed.getPublicKeyAsync(restoPrivKeyBytes);
  const restoPrivKey = Buffer.from(restoPrivKeyBytes).toString("base64");
  const restoPubKey = Buffer.from(restoPubKeyBytes).toString("base64");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Create issuers
  const hotel = await prisma.issuer.create({
    data: {
      name: "Grand Hyatt Jakarta",
      email: "billing@grandhyatt.example.com",
      passwordHash,
      publicKey: hotelPubKey,
      encryptedPrivateKey: encryptPrivateKey(hotelPrivKey, secret),
    },
  });

  const restaurant = await prisma.issuer.create({
    data: {
      name: "Warung Nusantara",
      email: "billing@warungnusantara.example.com",
      passwordHash,
      publicKey: restoPubKey,
      encryptedPrivateKey: encryptPrivateKey(restoPrivKey, secret),
    },
  });

  // Create sessions so user can log in immediately
  const hotelSessionId = crypto.randomBytes(32).toString("hex");
  const restoSessionId = crypto.randomBytes(32).toString("hex");
  await prisma.session.createMany({
    data: [
      {
        id: hotelSessionId,
        issuerId: hotel.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: restoSessionId,
        issuerId: restaurant.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("Created issuers:");
  console.log("  Hotel: billing@grandhyatt.example.com / password123");
  console.log("  Restaurant: billing@warungnusantara.example.com / password123");

  // Generate bills
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const billConfigs = [
    // Hotel bills (13)
    { issuer: hotel, privKey: hotelPrivKey, food: 850000, bev: 350000, pt: "card", daysAgo: 1, guest: 0 },
    { issuer: hotel, privKey: hotelPrivKey, food: 1250000, bev: 500000, pt: "card", daysAgo: 2, guest: 1 },
    { issuer: hotel, privKey: hotelPrivKey, food: 450000, bev: 150000, pt: "cash", daysAgo: 3, guest: 2 },
    { issuer: hotel, privKey: hotelPrivKey, food: 2200000, bev: 800000, pt: "transfer", daysAgo: 5, guest: 3 },
    { issuer: hotel, privKey: hotelPrivKey, food: 680000, bev: 220000, pt: "e-wallet", daysAgo: 7, guest: 4, voucher: 0 },
    { issuer: hotel, privKey: hotelPrivKey, food: 1500000, bev: 600000, pt: "card", daysAgo: 10, guest: 5 },
    { issuer: hotel, privKey: hotelPrivKey, food: 320000, bev: 80000, pt: "cash", daysAgo: 12, guest: 6, revoke: true },
    { issuer: hotel, privKey: hotelPrivKey, food: 950000, bev: 400000, pt: "card", daysAgo: 14, guest: 7 },
    { issuer: hotel, privKey: hotelPrivKey, food: 1800000, bev: 700000, pt: "transfer", daysAgo: 17, guest: 8, voucher: 1 },
    { issuer: hotel, privKey: hotelPrivKey, food: 550000, bev: 200000, pt: "e-wallet", daysAgo: 20, guest: 20 },
    { issuer: hotel, privKey: hotelPrivKey, food: 750000, bev: 300000, pt: "card", daysAgo: 22, guest: 9 },
    { issuer: hotel, privKey: hotelPrivKey, food: 1100000, bev: 450000, pt: "cash", daysAgo: 25, guest: 10 },
    { issuer: hotel, privKey: hotelPrivKey, food: 2500000, bev: 1000000, pt: "card", daysAgo: 28, guest: 11 },
    // Restaurant bills (12)
    { issuer: restaurant, privKey: restoPrivKey, food: 185000, bev: 45000, pt: "cash", daysAgo: 1, guest: 12 },
    { issuer: restaurant, privKey: restoPrivKey, food: 250000, bev: 60000, pt: "e-wallet", daysAgo: 2, guest: 13, marketplace: 0 },
    { issuer: restaurant, privKey: restoPrivKey, food: 320000, bev: 85000, pt: "card", daysAgo: 4, guest: 14 },
    { issuer: restaurant, privKey: restoPrivKey, food: 150000, bev: 35000, pt: "cash", daysAgo: 6, guest: 15, voucher: 2 },
    { issuer: restaurant, privKey: restoPrivKey, food: 420000, bev: 120000, pt: "transfer", daysAgo: 8, guest: 16 },
    { issuer: restaurant, privKey: restoPrivKey, food: 280000, bev: 70000, pt: "e-wallet", daysAgo: 11, guest: 17, marketplace: 1 },
    { issuer: restaurant, privKey: restoPrivKey, food: 195000, bev: 50000, pt: "cash", daysAgo: 13, guest: 18, revoke: true },
    { issuer: restaurant, privKey: restoPrivKey, food: 380000, bev: 95000, pt: "card", daysAgo: 16, guest: 19 },
    { issuer: restaurant, privKey: restoPrivKey, food: 210000, bev: 55000, pt: "e-wallet", daysAgo: 19, guest: 21 },
    { issuer: restaurant, privKey: restoPrivKey, food: 450000, bev: 130000, pt: "card", daysAgo: 21, guest: 22, voucher: 3 },
    { issuer: restaurant, privKey: restoPrivKey, food: 165000, bev: 40000, pt: "cash", daysAgo: 24, guest: 23, marketplace: 2 },
    { issuer: restaurant, privKey: restoPrivKey, food: 520000, bev: 150000, pt: "transfer", daysAgo: 27, guest: 24 },
  ];

  let billCount = 0;
  for (const cfg of billConfigs) {
    const subtotal = cfg.food + cfg.bev;
    const serviceCharge = Math.round(subtotal * 0.06);
    const serviceTax = Math.round(subtotal * 0.1);
    const grandTotal = subtotal + serviceCharge + serviceTax;

    const billDate = new Date(now - cfg.daysAgo * DAY);
    const billId = `SEED${String(billCount + 1).padStart(4, "0")}`;

    const hasVoucher = cfg.voucher !== undefined;
    const hasMarketplace = cfg.marketplace !== undefined;

    const signableData: Record<string, unknown> = {
      v: 1,
      iss: cfg.issuer.name,
      sf: cfg.food,
      sb: cfg.bev,
      st: subtotal,
      sc: serviceCharge,
      stx: serviceTax,
      lt: serviceTax,
      gt: grandTotal,
      bdt: billDate.toISOString(),
      pt: cfg.pt,
      vu: hasVoucher,
      pub: cfg.issuer.publicKey,
    };

    const paidDate = new Date(billDate.getTime() + 45 * 60 * 1000);
    signableData.pdt = paidDate.toISOString();

    const guestName = GUEST_NAMES[cfg.guest] || null;
    if (guestName) signableData.gn = guestName;
    if (hasVoucher) signableData.vc = VOUCHER_CODES[cfg.voucher!];
    if (hasMarketplace) {
      signableData.mp = MARKETPLACE_PARTNERS[cfg.marketplace!];
      signableData.mrc = `MKT-${billId}`;
      signableData.mbdt = new Date(billDate.getTime() - 30 * 60 * 1000).toISOString();
    }

    const signature = await signPayload(signableData, cfg.privKey);

    await prisma.bill.create({
      data: {
        id: billId,
        issuerId: cfg.issuer.id,
        guestName,
        subtotalFood: cfg.food,
        subtotalBeverage: cfg.bev,
        subtotal,
        serviceCharge,
        serviceTax,
        grandTotal,
        billDateTime: billDate,
        paidDateTime: paidDate,
        paymentType: cfg.pt,
        voucherUse: hasVoucher,
        voucherCode: hasVoucher ? VOUCHER_CODES[cfg.voucher!] : null,
        marketplacePartner: hasMarketplace ? MARKETPLACE_PARTNERS[cfg.marketplace!] : null,
        marketplaceReferenceCode: hasMarketplace ? `MKT-${billId}` : null,
        marketplaceBillDateTime: hasMarketplace
          ? new Date(billDate.getTime() - 30 * 60 * 1000)
          : null,
        signature,
        revoked: cfg.revoke === true,
        revokedAt: cfg.revoke ? new Date() : null,
      },
    });

    if (cfg.revoke) {
      await prisma.revocationLog.create({
        data: {
          billId,
          reason: billCount < 10 ? "Duplicate bill entry" : "Customer dispute",
        },
      });
    }

    billCount++;
  }

  console.log(`Created ${billCount} bills (${billConfigs.filter((c) => c.revoke).length} revoked)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
