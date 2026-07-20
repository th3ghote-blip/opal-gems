"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();

    if (password) {
      // Password login — email can be a dummy address, no inbox needed
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setError(error.message);
      } else {
        // Record the sign-in event (attributed server-side from the fresh session).
        await fetch("/api/auth/signed-in", { method: "POST" }).catch(() => {});
        // Honor ?next=/path so external links (e.g. website "Register Customer")
        // can land staff on a specific page. Internal paths only — no open redirect.
        const next = new URLSearchParams(window.location.search).get("next");
        const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
        router.push(safe);
      }
    } else {
      // Magic link — real email required
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setStatus("error");
        setError(error.message);
      } else {
        setStatus("sent");
      }
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-gold-600 dark:text-gold-300">Opal Gems</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to continue</p>

        {status === "sent" ? (
          <div className="mt-8 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <p className="text-sm">
              Check your inbox — we sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <label className="block">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-neutral-400"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Password{" "}
                <span className="font-normal text-neutral-400 text-xs">(leave blank for a magic link)</span>
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-neutral-400"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {status === "sending" ? "Signing in…" : password ? "Sign in" : "Send sign-in link"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
