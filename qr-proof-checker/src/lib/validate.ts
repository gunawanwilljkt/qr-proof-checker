const PAYMENT_TYPES = ["cash", "card", "e-wallet", "transfer"] as const;

export interface BillInput {
  guestName?: string;
  subtotalFood: number;
  subtotalBeverage: number;
  subtotal: number;
  serviceCharge: number;
  serviceTax: number;
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
    "serviceTax",
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
      error: "marketplaceReferenceCode is required when marketplacePartner is set",
    };
  }

  return { success: true, data: input as BillInput };
}
