"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.issuer) setUser(data.issuer);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-slate-50">
          QR Proof Checker
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/verify"
            className="text-sm text-slate-400 hover:text-slate-50 transition-colors"
          >
            Verify
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-slate-400 hover:text-slate-50 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-400 hover:text-slate-50 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
