"use client";

import { useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (data: string) => void;
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!scanning || !scannerRef.current) return;

    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("qr-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            scanner?.stop().catch(() => {});
            setScanning(false);
          },
          () => {}
        );
      } catch {
        setError("Could not access camera. Please upload a QR image instead.");
        setScanning(false);
      }
    })();

    return () => {
      scanner?.stop().catch(() => {});
    };
  }, [scanning, onScan]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-file-reader");
    try {
      const result = await scanner.scanFile(file, true);
      onScan(result);
    } catch {
      setError("Could not read QR code from image.");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => {
            setError(null);
            setScanning(!scanning);
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {scanning ? "Stop Camera" : "Scan with Camera"}
        </button>
        <label className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Upload QR Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {scanning && (
        <div id="qr-reader" ref={scannerRef} className="mx-auto max-w-sm" />
      )}
      <div id="qr-file-reader" className="hidden" />
    </div>
  );
}
