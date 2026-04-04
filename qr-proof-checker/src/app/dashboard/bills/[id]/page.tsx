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
