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
      <p className="py-8 text-center text-gray-500">
        No bills yet. Create your first bill.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-gray-600">
          <tr>
            <th className="py-3 pr-4">ID</th>
            <th className="py-3 pr-4">Guest</th>
            <th className="py-3 pr-4">Total</th>
            <th className="py-3 pr-4">Payment</th>
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id} className="border-b hover:bg-gray-50">
              <td className="py-3 pr-4">
                <Link
                  href={`/dashboard/bills/${bill.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {bill.id}
                </Link>
              </td>
              <td className="py-3 pr-4">{bill.guestName || "-"}</td>
              <td className="py-3 pr-4">{formatCurrency(bill.grandTotal)}</td>
              <td className="py-3 pr-4 capitalize">{bill.paymentType}</td>
              <td className="py-3 pr-4">{formatDate(bill.billDateTime)}</td>
              <td className="py-3 pr-4">
                {bill.revoked ? (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                    Revoked
                  </span>
                ) : (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
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
