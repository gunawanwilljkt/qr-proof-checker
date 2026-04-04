"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BillForm from "@/components/bill-form";

export default function NewBillPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: Record<string, unknown>) {
    setError("");
    setLoading(true);

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create bill");
      setLoading(false);
      return;
    }

    const { bill } = await res.json();
    router.push(`/dashboard/bills/${bill.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create New Bill</h1>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <BillForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
