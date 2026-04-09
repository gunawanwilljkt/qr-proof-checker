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

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20";
const labelClass = "block text-sm font-medium text-slate-400";

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
      serviceTax: Number(form.get("serviceTax")),
      cityTax: Number(form.get("cityTax")),
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
        <label className={labelClass}>Guest Name (optional)</label>
        <input name="guestName" type="text" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Subtotal Food</label>
          <input name="subtotalFood" type="number" min="0" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Subtotal Beverage</label>
          <input name="subtotalBeverage" type="number" min="0" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Subtotal</label>
          <input name="subtotal" type="number" min="0" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Service Charge</label>
          <input name="serviceCharge" type="number" min="0" required className={inputClass} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-indigo-400 uppercase tracking-wide">Tax Breakdown</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Service Tax / PB1 (10%)</label>
            <input name="serviceTax" type="number" min="0" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City Tax</label>
            <input name="cityTax" type="number" min="0" required className={inputClass} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Grand Total</label>
        <input name="grandTotal" type="number" min="0" required className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Bill Date & Time</label>
          <input name="billDateTime" type="datetime-local" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Paid Date & Time (optional)</label>
          <input name="paidDateTime" type="datetime-local" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Payment Type</label>
        <select name="paymentType" required className={inputClass}>
          {PAYMENT_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>{pt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={voucherUse} onChange={(e) => setVoucherUse(e.target.checked)} className="rounded border-slate-600 bg-slate-800" />
          <span className="text-sm font-medium text-slate-400">Voucher Used</span>
        </label>
        {voucherUse && (
          <div>
            <label className={labelClass}>Voucher Code</label>
            <input name="voucherCode" type="text" required className={inputClass} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasMarketplace} onChange={(e) => setHasMarketplace(e.target.checked)} className="rounded border-slate-600 bg-slate-800" />
          <span className="text-sm font-medium text-slate-400">Marketplace Order</span>
        </label>
        {hasMarketplace && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Marketplace Partner</label>
              <input name="marketplacePartner" type="text" required placeholder="e.g., GrabFood, GoFood, ShopeeFood" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Marketplace Reference Code</label>
              <input name="marketplaceReferenceCode" type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Marketplace Bill Date & Time</label>
              <input name="marketplaceBillDateTime" type="datetime-local" required className={inputClass} />
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors">
        {loading ? "Creating..." : "Create Bill & Generate QR"}
      </button>
    </form>
  );
}
