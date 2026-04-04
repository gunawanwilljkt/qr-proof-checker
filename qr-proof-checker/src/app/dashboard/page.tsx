"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BillTable from "@/components/bill-table";

interface Bill {
  id: string;
  guestName: string | null;
  grandTotal: number;
  paymentType: string;
  billDateTime: string;
  revoked: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bills")
      .then((res) => res.json())
      .then((data) => {
        setBills(data.bills || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/dashboard/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Create Bill
        </Link>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading bills...</p>
      ) : (
        <BillTable bills={bills} />
      )}
    </div>
  );
}
