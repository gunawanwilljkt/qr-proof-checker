"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import VerificationResult from "@/components/verification-result";

export default function ShortVerifyPage() {
  const params = useParams();
  const [status, setStatus] = useState<"valid" | "invalid" | "revoked" | null>(null);
  const [billData, setBillData] = useState<Record<string, unknown> | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyFromFragment() {
      const fragment = window.location.hash.slice(1);
      if (!fragment) {
        setStatus("invalid");
        setLoading(false);
        return;
      }

      try {
        const { decodePayload } = await import("@/lib/qr-payload");
        const { verify } = await import("@/lib/crypto");

        const payload = decodePayload(fragment);
        const { sig, ...dataWithoutSig } = payload;

        const isValid = await verify(dataWithoutSig, sig, payload.pub);

        if (!isValid) {
          setStatus("invalid");
          setLoading(false);
          return;
        }

        try {
          const res = await fetch(`/api/bills/${params.billId}/status`);
          if (res.ok) {
            const statusData = await res.json();
            if (statusData.revoked) {
              setStatus("revoked");
              setBillData(dataWithoutSig as Record<string, unknown>);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Offline — skip revocation check
        }

        setStatus("valid");
        setBillData(dataWithoutSig as Record<string, unknown>);
      } catch {
        setStatus("invalid");
      }

      setLoading(false);
    }

    verifyFromFragment();
  }, [params.billId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-slate-500">Verifying bill...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-slate-50">Bill Verification</h1>
      <VerificationResult status={status} billData={billData as any} />
    </div>
  );
}
