export interface BillPayload {
  v: number;
  iss: string;
  gn?: string;
  sf: number;
  sb: number;
  st: number;
  sc: number;
  vat: number;
  stx: number;
  ctx: number;
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
