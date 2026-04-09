"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import BillTable from "@/components/bill-table";

interface Bill {
  id: string;
  guestName: string | null;
  grandTotal: number;
  serviceTax: number;
  cityTax: number;
  subtotalFood: number;
  subtotalBeverage: number;
  subtotal: number;
  serviceCharge: number;
  paymentType: string;
  billDateTime: string;
  revoked: boolean;
  createdAt: string;
}

const PAYMENT_TYPES = ["cash", "card", "e-wallet", "transfer"];

const inputClass =
  "rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-50 focus:border-indigo-500";

export default function DashboardPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  useEffect(() => {
    fetch("/api/bills")
      .then((res) => res.json())
      .then((data) => {
        setBills(data.bills || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return bills.filter((bill) => {
      if (search && !bill.guestName?.toLowerCase().includes(search.toLowerCase()) && !bill.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (dateFrom && new Date(bill.billDateTime) < new Date(dateFrom)) return false;
      if (dateTo && new Date(bill.billDateTime) > new Date(dateTo + "T23:59:59")) return false;
      if (paymentFilter && bill.paymentType !== paymentFilter) return false;
      if (statusFilter === "active" && bill.revoked) return false;
      if (statusFilter === "revoked" && !bill.revoked) return false;
      if (minAmount && bill.grandTotal < Number(minAmount)) return false;
      if (maxAmount && bill.grandTotal > Number(maxAmount)) return false;
      return true;
    });
  }, [bills, search, dateFrom, dateTo, paymentFilter, statusFilter, minAmount, maxAmount]);

  function resetFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("");
    setStatusFilter("");
    setMinAmount("");
    setMaxAmount("");
  }

  function exportCsv() {
    const headers = ["Bill ID", "Guest Name", "Subtotal Food", "Subtotal Beverage", "Subtotal", "Service Charge", "Service Tax", "City Tax", "Grand Total", "Payment Type", "Date", "Status"];
    const rows = filtered.map((b) => [
      b.id,
      b.guestName || "",
      b.subtotalFood,
      b.subtotalBeverage,
      b.subtotal,
      b.serviceCharge,
      b.serviceTax,
      b.cityTax,
      b.grandTotal,
      b.paymentType,
      new Date(b.billDateTime).toISOString(),
      b.revoked ? "Revoked" : "Active",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bills-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50">Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={exportCsv}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors no-print"
          >
            Export CSV
          </button>
          <Link
            href="/dashboard/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 transition-colors"
          >
            Create Bill
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl p-4 space-y-3 no-print">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Guest name or bill ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Payment</label>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={inputClass}>
              <option value="">All</option>
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Min Amount</label>
            <input type="number" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className={inputClass + " w-28"} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max Amount</label>
            <input type="number" placeholder="∞" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className={inputClass + " w-28"} />
          </div>
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Reset
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Showing {filtered.length} of {bills.length} bills
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading bills...</p>
      ) : (
        <BillTable bills={filtered} />
      )}
    </div>
  );
}
