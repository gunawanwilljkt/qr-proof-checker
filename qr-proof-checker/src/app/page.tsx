import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
        QR Proof Checker
      </h1>
      <p className="mt-6 max-w-lg text-lg text-slate-400">
        Verify the authenticity of hotel and restaurant bills instantly. Scan a
        QR code to confirm a bill is genuine, unaltered, and issued by a
        registered establishment.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/verify"
          className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-500 transition-colors font-medium"
        >
          Verify a Bill
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-700 px-6 py-3 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
        >
          Sign In as Issuer
        </Link>
      </div>
    </div>
  );
}
