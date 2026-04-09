"use client";

import Link from "next/link";

interface Bill {
  id: string;
  guestName: string | null;
  grandTotal: number;
  paymentType: string;
  billDateTime: string;
  revoked: boolean;
  createdAt: string;
}

export default function BillTable({ bills }: { bills: Bill[] }) {
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (bills.length === 0) {
    return (
      <p className="py-8 text-center text-slate-500">
        No bills match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/50">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-700 bg-slate-800/50 text-slate-400">
          <tr>
            <th className="py-3 px-4">ID</th>
            <th className="py-3 px-4">Guest</th>
            <th className="py-3 px-4">Total</th>
            <th className="py-3 px-4">Payment</th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
              <td className="py-3 px-4">
                <Link
                  href={`/dashboard/bills/${bill.id}`}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  {bill.id}
                </Link>
              </td>
              <td className="py-3 px-4 text-slate-300">{bill.guestName || "-"}</td>
              <td className="py-3 px-4 text-slate-300">{formatCurrency(bill.grandTotal)}</td>
              <td className="py-3 px-4 capitalize text-slate-300">{bill.paymentType}</td>
              <td className="py-3 px-4 text-slate-300">{formatDate(bill.billDateTime)}</td>
              <td className="py-3 px-4">
                {bill.revoked ? (
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400">
                    Revoked
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    Active
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
