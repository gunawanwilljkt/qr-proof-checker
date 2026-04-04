import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-900">QR Proof Checker</h1>
      <p className="mt-4 max-w-lg text-lg text-gray-600">
        Verify the authenticity of hotel and restaurant bills instantly. Scan a
        QR code to confirm a bill is genuine, unaltered, and issued by a
        registered establishment.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/verify"
          className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Verify a Bill
        </Link>
        <Link
          href="/login"
          className="rounded border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50"
        >
          Sign In as Issuer
        </Link>
      </div>
    </div>
  );
}
