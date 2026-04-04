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
