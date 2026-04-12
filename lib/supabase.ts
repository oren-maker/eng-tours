import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client - always uses anon key (RLS is disabled)
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
