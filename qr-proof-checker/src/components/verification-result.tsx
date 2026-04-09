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
    stx?: number;
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
        <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-6">
          <h2 className="mb-2 text-xl font-bold text-emerald-400">Bill Verified</h2>
          <p className="text-sm text-emerald-400/80">
            This bill is authentic and has not been tampered with.
          </p>
        </div>
      )}

      {status === "invalid" && (
        <div className="rounded-xl border-2 border-rose-500/50 bg-rose-500/10 p-6">
          <h2 className="text-xl font-bold text-rose-400">Verification Failed</h2>
          <p className="mt-2 text-sm text-rose-400/80">
            This bill could not be verified. It may have been tampered with or is not authentic.
          </p>
        </div>
      )}

      {status === "revoked" && (
        <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-6">
          <h2 className="text-xl font-bold text-amber-400">Bill Revoked</h2>
          <p className="mt-2 text-sm text-amber-400/80">
            The signature is valid, but the issuer has revoked this bill.
          </p>
        </div>
      )}

      {billData && status !== "invalid" && (
        <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl p-6">
          <h3 className="mb-3 font-medium text-slate-200">Bill Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-slate-500">Issued by:</span>
            <span className="font-medium text-slate-200">{billData.iss}</span>
            {billData.gn && (
              <>
                <span className="text-slate-500">Guest:</span>
                <span className="text-slate-200">{billData.gn}</span>
              </>
            )}
            <span className="text-slate-500">Subtotal Food:</span>
            <span className="text-slate-200">{formatCurrency(billData.sf)}</span>
            <span className="text-slate-500">Subtotal Beverage:</span>
            <span className="text-slate-200">{formatCurrency(billData.sb)}</span>
            <span className="text-slate-500">Subtotal:</span>
            <span className="text-slate-200">{formatCurrency(billData.st)}</span>
            <span className="text-slate-500">Service Charge:</span>
            <span className="text-slate-200">{formatCurrency(billData.sc)}</span>

            {billData.stx !== undefined && (
              <>
                <span className="col-span-2 mt-2 text-xs font-semibold text-indigo-400 uppercase tracking-wide">Tax Breakdown</span>
                <span className="text-slate-500">PB1 (10%):</span>
                <span className="text-slate-200">{formatCurrency(billData.stx)}</span>
              </>
            )}

            <span className="text-slate-500">Total Tax:</span>
            <span className="text-slate-200">{formatCurrency(billData.lt)}</span>
            <span className="col-span-2 mt-1 border-t border-slate-700 pt-1"></span>
            <span className="text-slate-400 font-bold">Grand Total:</span>
            <span className="font-bold text-slate-50">{formatCurrency(billData.gt)}</span>
            <span className="text-slate-500">Bill Date:</span>
            <span className="text-slate-200">{formatDate(billData.bdt)}</span>
            {billData.pdt && (
              <>
                <span className="text-slate-500">Paid Date:</span>
                <span className="text-slate-200">{formatDate(billData.pdt)}</span>
              </>
            )}
            <span className="text-slate-500">Payment:</span>
            <span className="capitalize text-slate-200">{billData.pt}</span>
            {billData.vu && billData.vc && (
              <>
                <span className="text-slate-500">Voucher:</span>
                <span className="text-slate-200">{billData.vc}</span>
              </>
            )}
            {billData.mp && (
              <>
                <span className="text-slate-500">Marketplace:</span>
                <span className="text-slate-200">{billData.mp}</span>
                {billData.mrc && (
                  <>
                    <span className="text-slate-500">Marketplace Ref:</span>
                    <span className="text-slate-200">{billData.mrc}</span>
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
