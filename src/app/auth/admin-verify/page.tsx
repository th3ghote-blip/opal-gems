"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Admin-generated magic link bypass.
// Receives ?email=X&otp=Y in URL, runs supabase.auth.verifyOtp on the browser
// (no PKCE code_verifier needed) which sets the session cookies directly.
function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "ok" | "err">("working");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const email = params.get("email") ?? "";
    const token = params.get("otp") ?? "";
    if (!email || !token) {
      setStatus("err");
      setMsg("Missing email or otp param");
      return;
    }
    const sb = createClient();
    sb.auth.verifyOtp({ email, token, type: "email" }).then(({ error }) => {
      if (error) {
        setStatus("err");
        setMsg(error.message);
      } else {
        setStatus("ok");
        router.replace("/dashboard");
        router.refresh();
      }
    });
  }, [params, router]);

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-semibold">Opal Gems</h1>
        <p className="mt-3 text-sm text-neutral-500">
          {status === "working" && "Signing you in…"}
          {status === "ok" && "Signed in — redirecting…"}
          {status === "err" && <span className="text-red-600">Sign-in failed: {msg}</span>}
        </p>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
