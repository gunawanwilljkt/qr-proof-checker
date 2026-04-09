import { describe, it, expect } from "vitest";
import { validateBillInput, type BillInput } from "@/lib/validate";

const validInput: BillInput = {
  guestName: "Jane Doe",
  subtotalFood: 150000,
  subtotalBeverage: 75000,
  subtotal: 225000,
  serviceCharge: 22500,
  serviceTax: 22500,
  grandTotal: 270000,
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
      serviceTax: 5000,
      grandTotal: 60000,
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

  it("rejects negative serviceTax", () => {
    const result = validateBillInput({ ...validInput, serviceTax: -1 });
    expect(result.success).toBe(false);
    expect(result.error).toContain("serviceTax");
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
