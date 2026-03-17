"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface SessionUser {
  role: "FRONT_OFFICE" | "ADMIN" | "DOCTOR";
  displayName: string;
}

export default function AuthNavActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setLoading(true);
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        if (mounted) { setUser(null); setLoading(false); }
        return;
      }

      const data = (await res.json()) as {
        authenticated: boolean;
        user: SessionUser | null;
      };

      if (!mounted) return;
      setUser(data.authenticated ? data.user : null);
      setLoading(false);
    }

    loadSession();

    return () => { mounted = false; };
  }, [pathname]); // re-fetch every time the active route changes

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (loading) {
    return <div className="w-20" />;
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="px-4 py-2 btn-primary text-sm font-semibold rounded-xl shadow-md shadow-cyan-200/50 transition-transform duration-200 hover:scale-105"
      >
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-xs font-semibold text-cyan-700 bg-cyan-100/70 px-2.5 py-1 rounded-full">
        {user.displayName}
      </span>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="px-4 py-2 text-sm font-semibold rounded-xl border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 transition-colors disabled:opacity-60"
      >
        {signingOut ? "Signing out..." : "Sign Out"}
      </button>
    </div>
  );
}
