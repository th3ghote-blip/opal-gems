import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client with service_role key. NEVER import from client code.
// Use ONLY in route handlers / server actions, AFTER verifying the caller's role.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
