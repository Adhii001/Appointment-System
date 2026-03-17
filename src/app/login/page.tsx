"use client";

import { FormEvent, useState } from "react";

interface LoginResponse {
  redirectPath: string;
  user: {
    role: "FRONT_OFFICE" | "ADMIN" | "DOCTOR";
    username: string;
    displayName: string;
    doctorId: number | null;
  };
}

const FEATURES = [
  "Real-time appointment scheduling",
  "Multi-doctor slot management",
  "Patient record tracking",
  "Remote system integration",
];

const ROLES = [
  { label: "Front Office", hint: "frontoffice / frontoffice", colors: "bg-sky-100 text-sky-700 border-sky-200" },
  { label: "Admin", hint: "admin / admin", colors: "bg-violet-100 text-violet-700 border-violet-200" },
  { label: "Doctor", hint: "First name as ID & password", colors: "bg-teal-100 text-teal-700 border-teal-200" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = (await res.json().catch(() => null)) as LoginResponse | { error?: string } | null;

    if (!res.ok) {
      setSubmitting(false);
      setError(data && "error" in data ? data.error || "Invalid credentials" : "Invalid credentials");
      return;
    }

    const redirectPath = (data as LoginResponse).redirectPath || "/home";
    window.location.href = redirectPath;
  }

  return (
    /* Break out of the layout's px + py padding to fill the full viewport below the navbar */
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex min-h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ── Left branding panel (visible on lg+) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0c4a6e 0%, #0e7490 45%, #0f766e 100%)" }}>

        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #67e8f9, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #5eead4, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #ffffff, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg shadow-black/20">
            🏥
          </div>
          <span className="text-white text-xl font-bold tracking-tight">MedAppoint</span>
        </div>

        {/* Headline + features */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse" />
            <span className="text-teal-200 text-xs font-medium">Healthcare Management Portal</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            Integrated Clinic<br />Management System
          </h2>
          <p className="text-cyan-200/80 text-base mb-10 leading-relaxed">
            Streamline appointments, manage patients, and coordinate care — all in one secure platform.
          </p>

          <ul className="space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-teal-400/20 border border-teal-300/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-cyan-100/90 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-cyan-400/60 text-xs">© 2026 MedAppoint</p>
          <span className="flex items-center gap-1.5 text-cyan-400/60 text-xs">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure connection
          </span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 sm:px-10 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center text-white shadow-md">
              🏥
            </div>
            <span className="text-lg font-bold text-cyan-800">MedAppoint</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1.5">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors text-sm"
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors text-sm"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              style={{ background: submitting ? "#0891b2" : "linear-gradient(135deg, #0891b2 0%, #0d9488 100%)" }}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Role reference */}
          <div className="mt-8 rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Access Roles</p>
            </div>
            <div className="divide-y divide-gray-100">
              {ROLES.map(({ label, hint, colors }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${colors} flex-shrink-0`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-400">{hint}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
