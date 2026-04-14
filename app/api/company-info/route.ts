export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const KEYS = ["company_name", "company_tagline", "company_phone", "company_email", "company_website", "company_address", "company_vat_id"];

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("system_settings").select("key, value").in("key", KEYS);
  const result: Record<string, string> = {};
  for (const k of KEYS) result[k] = "";
  for (const row of data || []) (result as any)[row.key] = row.value || "";
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const supabase = createServiceClient();
  for (const k of KEYS) {
    if (body[k] !== undefined) {
      await supabase.from("system_settings").upsert(
        { key: k, value: String(body[k] ?? ""), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
  }
  return NextResponse.json({ success: true });
}
