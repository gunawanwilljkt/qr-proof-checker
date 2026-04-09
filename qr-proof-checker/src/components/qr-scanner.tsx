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
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => {
            setError(null);
            setScanning(!scanning);
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 transition-colors"
        >
          {scanning ? "Stop Camera" : "Scan with Camera"}
        </button>
        <label className="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
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
        <div id="qr-reader" ref={scannerRef} className="mx-auto max-w-sm rounded-lg overflow-hidden" />
      )}
      <div id="qr-file-reader" className="hidden" />
    </div>
  );
}
