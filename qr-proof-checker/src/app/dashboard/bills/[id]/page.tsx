"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BillDetail {
  id: string;
  guestName: string | null;
  subtotalFood: number;
  subtotalBeverage: number;
  subtotal: number;
  serviceCharge: number;
  vat: number;
  serviceTax: number;
  cityTax: number;
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

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `bill-${bill?.id}-qr.png`;
    a.click();
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!bill) return <p className="text-rose-400">Bill not found</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-50">Bill {bill.id}</h1>
        <button
          onClick={() => window.print()}
          className="no-print rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Print
        </button>
      </div>

      {bill.revoked && (
        <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400">
          This bill has been revoked
          {bill.revokedAt && ` on ${formatDate(bill.revokedAt)}`}.
        </div>
      )}

      {qrDataUrl && (
        <div className="mb-6 text-center rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg" />
          <button
            onClick={handleDownloadQr}
            className="no-print mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Download QR Code
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl p-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <span className="text-slate-500">Guest:</span>
          <span className="text-slate-200">{bill.guestName || "-"}</span>
          <span className="text-slate-500">Subtotal Food:</span>
          <span className="text-slate-200">{formatCurrency(bill.subtotalFood)}</span>
          <span className="text-slate-500">Subtotal Beverage:</span>
          <span className="text-slate-200">{formatCurrency(bill.subtotalBeverage)}</span>
          <span className="text-slate-500">Subtotal:</span>
          <span className="text-slate-200">{formatCurrency(bill.subtotal)}</span>
          <span className="text-slate-500">Service Charge:</span>
          <span className="text-slate-200">{formatCurrency(bill.serviceCharge)}</span>

          <span className="col-span-2 mt-2 text-xs font-semibold text-indigo-400 uppercase tracking-wide">Tax Breakdown</span>
          <span className="text-slate-500">VAT / PPN (11%):</span>
          <span className="text-slate-200">{formatCurrency(bill.vat)}</span>
          <span className="text-slate-500">Service Tax / PB1 (10%):</span>
          <span className="text-slate-200">{formatCurrency(bill.serviceTax)}</span>
          <span className="text-slate-500">City Tax:</span>
          <span className="text-slate-200">{formatCurrency(bill.cityTax)}</span>
          <span className="text-slate-500">Total Tax:</span>
          <span className="text-slate-200">{formatCurrency(bill.vat + bill.serviceTax + bill.cityTax)}</span>

          <span className="col-span-2 mt-2 border-t border-slate-700 pt-2"></span>
          <span className="text-slate-400 font-bold">Grand Total:</span>
          <span className="font-bold text-slate-50 text-base">{formatCurrency(bill.grandTotal)}</span>
          <span className="text-slate-500">Bill Date:</span>
          <span className="text-slate-200">{formatDate(bill.billDateTime)}</span>
          {bill.paidDateTime && (
            <>
              <span className="text-slate-500">Paid Date:</span>
              <span className="text-slate-200">{formatDate(bill.paidDateTime)}</span>
            </>
          )}
          <span className="text-slate-500">Payment Type:</span>
          <span className="capitalize text-slate-200">{bill.paymentType}</span>
          {bill.voucherUse && (
            <>
              <span className="text-slate-500">Voucher Code:</span>
              <span className="text-slate-200">{bill.voucherCode}</span>
            </>
          )}
          {bill.marketplacePartner && (
            <>
              <span className="text-slate-500">Marketplace:</span>
              <span className="text-slate-200">{bill.marketplacePartner}</span>
              <span className="text-slate-500">Marketplace Ref:</span>
              <span className="text-slate-200">{bill.marketplaceReferenceCode}</span>
              {bill.marketplaceBillDateTime && (
                <>
                  <span className="text-slate-500">Marketplace Date:</span>
                  <span className="text-slate-200">{formatDate(bill.marketplaceBillDateTime)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!bill.revoked && (
        <div className="no-print mt-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <h3 className="mb-2 font-medium text-rose-400">Revoke this bill</h3>
          <input
            type="text"
            placeholder="Reason for revocation"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-50"
          />
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
          >
            {revoking ? "Revoking..." : "Revoke Bill"}
          </button>
        </div>
      )}
    </div>
  );
}
