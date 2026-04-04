"use client";

import { useState, useCallback } from "react";
import QrScanner from "@/components/qr-scanner";
import VerificationResult from "@/components/verification-result";

export default function VerifyPage() {
  const [status, setStatus] = useState<"valid" | "invalid" | "revoked" | null>(null);
  const [billData, setBillData] = useState<Record<string, unknown> | undefined>(undefined);
  const [manualInput, setManualInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const processQrData = useCallback(async (data: string) => {
    setVerifying(true);
    setStatus(null);
    setBillData(undefined);

    try {
      let encodedPayload: string;
      if (data.includes("#")) {
        encodedPayload = data.split("#")[1];
      } else {
        encodedPayload = data;
      }

      const { decodePayload } = await import("@/lib/qr-payload");
      const { verify } = await import("@/lib/crypto");

      const payload = decodePayload(encodedPayload);
      const { sig, ...dataWithoutSig } = payload;

      const isValid = await verify(dataWithoutSig, sig, payload.pub);

      if (!isValid) {
        setStatus("invalid");
        setVerifying(false);
        return;
      }

      const billIdMatch = data.match(/\/v\/([^#]+)/);
      if (billIdMatch) {
        try {
          const res = await fetch(`/api/bills/${billIdMatch[1]}/status`);
          if (res.ok) {
            const statusData = await res.json();
            if (statusData.revoked) {
              setStatus("revoked");
              setBillData(dataWithoutSig as Record<string, unknown>);
              setVerifying(false);
              return;
            }
          }
        } catch {
          // Offline — skip revocation check
        }
      }

      setStatus("valid");
      setBillData(dataWithoutSig as Record<string, unknown>);
    } catch {
      setStatus("invalid");
    }

    setVerifying(false);
  }, []);

  function handleManualVerify() {
    if (manualInput.trim()) {
      processQrData(manualInput.trim());
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Verify a Bill</h1>
      <p className="mb-6 text-sm text-gray-600">
        Scan a QR code from a bill to verify its authenticity. You can use your
        camera, upload an image, or paste the QR data directly.
      </p>

      <QrScanner onScan={processQrData} />

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700">
          Or paste QR data / verification URL
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Paste URL or payload..."
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleManualVerify}
            disabled={verifying}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>

      <VerificationResult status={status} billData={billData as any} />
    </div>
  );
}
