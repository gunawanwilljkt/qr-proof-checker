"use client";

interface VerificationResultProps {
  status: "valid" | "invalid" | "revoked" | null;
  billData?: {
    iss: string;
    gn?: string;
    sf: number;
    sb: number;
    st: number;
    sc: number;
    lt: number;
    gt: number;
    bdt: string;
    pdt?: string;
    pt: string;
    vu: boolean;
    vc?: string;
    mp?: string;
    mrc?: string;
    mbdt?: string;
  };
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

export default function VerificationResult({
  status,
  billData,
}: VerificationResultProps) {
  if (!status) return null;

  return (
    <div className="mt-6">
      {status === "valid" && (
        <div className="rounded border-2 border-green-500 bg-green-50 p-6">
          <h2 className="mb-2 text-xl font-bold text-green-700">Bill Verified</h2>
          <p className="mb-4 text-sm text-green-600">
            This bill is authentic and has not been tampered with.
          </p>
        </div>
      )}

      {status === "invalid" && (
        <div className="rounded border-2 border-red-500 bg-red-50 p-6">
          <h2 className="text-xl font-bold text-red-700">Verification Failed</h2>
          <p className="mt-2 text-sm text-red-600">
            This bill could not be verified. It may have been tampered with or is not authentic.
          </p>
        </div>
      )}

      {status === "revoked" && (
        <div className="rounded border-2 border-yellow-500 bg-yellow-50 p-6">
          <h2 className="text-xl font-bold text-yellow-700">Bill Revoked</h2>
          <p className="mt-2 text-sm text-yellow-600">
            The signature is valid, but the issuer has revoked this bill.
          </p>
        </div>
      )}

      {billData && status !== "invalid" && (
        <div className="mt-4 rounded border p-4">
          <h3 className="mb-3 font-medium text-gray-900">Bill Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600">Issued by:</span>
            <span className="font-medium">{billData.iss}</span>
            {billData.gn && (
              <>
                <span className="text-gray-600">Guest:</span>
                <span>{billData.gn}</span>
              </>
            )}
            <span className="text-gray-600">Subtotal Food:</span>
            <span>{formatCurrency(billData.sf)}</span>
            <span className="text-gray-600">Subtotal Beverage:</span>
            <span>{formatCurrency(billData.sb)}</span>
            <span className="text-gray-600">Subtotal:</span>
            <span>{formatCurrency(billData.st)}</span>
            <span className="text-gray-600">Service Charge:</span>
            <span>{formatCurrency(billData.sc)}</span>
            <span className="text-gray-600">Local Tax:</span>
            <span>{formatCurrency(billData.lt)}</span>
            <span className="text-gray-600 font-bold">Grand Total:</span>
            <span className="font-bold">{formatCurrency(billData.gt)}</span>
            <span className="text-gray-600">Bill Date:</span>
            <span>{formatDate(billData.bdt)}</span>
            {billData.pdt && (
              <>
                <span className="text-gray-600">Paid Date:</span>
                <span>{formatDate(billData.pdt)}</span>
              </>
            )}
            <span className="text-gray-600">Payment:</span>
            <span className="capitalize">{billData.pt}</span>
            {billData.vu && billData.vc && (
              <>
                <span className="text-gray-600">Voucher:</span>
                <span>{billData.vc}</span>
              </>
            )}
            {billData.mp && (
              <>
                <span className="text-gray-600">Marketplace:</span>
                <span>{billData.mp}</span>
                {billData.mrc && (
                  <>
                    <span className="text-gray-600">Marketplace Ref:</span>
                    <span>{billData.mrc}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
