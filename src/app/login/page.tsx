"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
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
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
