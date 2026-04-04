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
        <label className="block text-sm font-medium text-gray-700">Guest Name (optional)</label>
        <input name="guestName" type="text" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Subtotal Food</label>
          <input name="subtotalFood" type="number" min="0" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Subtotal Beverage</label>
          <input name="subtotalBeverage" type="number" min="0" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Subtotal</label>
          <input name="subtotal" type="number" min="0" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Service Charge</label>
          <input name="serviceCharge" type="number" min="0" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Local Tax</label>
          <input name="localTax" type="number" min="0" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Grand Total</label>
          <input name="grandTotal" type="number" min="0" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Bill Date & Time</label>
          <input name="billDateTime" type="datetime-local" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Paid Date & Time (optional)</label>
          <input name="paidDateTime" type="datetime-local" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Type</label>
        <select name="paymentType" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
          {PAYMENT_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>{pt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={voucherUse} onChange={(e) => setVoucherUse(e.target.checked)} />
          <span className="text-sm font-medium text-gray-700">Voucher Used</span>
        </label>
        {voucherUse && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Voucher Code</label>
            <input name="voucherCode" type="text" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasMarketplace} onChange={(e) => setHasMarketplace(e.target.checked)} />
          <span className="text-sm font-medium text-gray-700">Marketplace Order</span>
        </label>
        {hasMarketplace && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Marketplace Partner</label>
              <input name="marketplacePartner" type="text" required placeholder="e.g., GrabFood, GoFood, ShopeeFood" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marketplace Reference Code</label>
              <input name="marketplaceReferenceCode" type="text" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marketplace Bill Date & Time</label>
              <input name="marketplaceBillDateTime" type="datetime-local" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Creating..." : "Create Bill & Generate QR"}
      </button>
    </form>
  );
}
