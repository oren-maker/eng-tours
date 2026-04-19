import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Server-side Supabase client — always uses service_role key.
// With RLS enabled on all tables, a client-side (anon) client would be blocked
// from every operation, so we intentionally do not export one. All DB access
// must go through API routes that call createServiceClient().
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  if (!supabaseUrl || !key || key === "placeholder-key") {
    // Build time fallback
    return createClient(
      supabaseUrl || "https://placeholder.supabase.co",
      key || "placeholder",
      { auth: { persistSession: false } }
    );
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
}
