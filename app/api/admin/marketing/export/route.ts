export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";

function csv(v: any) {
  if (v == null) return "";
  const s = String(v);
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = createServiceClient();
  const { data: participants } = await supabase
    .from("participants")
    .select("email, phone, first_name_en, last_name_en, marketing_consent, order_id, orders(created_at, events(destination_country))");
  const { data: users } = await supabase.from("users").select("email, phone, display_name, role, created_at");
  const { data: unsubs } = await supabase.from("email_unsubscribes").select("email");
  const unsubSet = new Set((unsubs || []).map((u: any) => u.email?.toLowerCase()));

  const rows: string[][] = [];
  rows.push(["מייל", "טלפון", "שם פרטי", "שם משפחה", "מדינה", "אישר שיווק", "מקור", "תאריך אחרון", "מוסר"]);

  const all: any[] = [];
  for (const p of participants || []) {
    const orderData = Array.isArray((p as any).orders) ? (p as any).orders[0] : (p as any).orders;
    all.push({
      email: p.email, phone: p.phone,
      first_name: p.first_name_en, last_name: p.last_name_en,
      country: orderData?.events?.destination_country,
      marketing: !!(p as any).marketing_consent,
      source: "booking", date: orderData?.created_at,
    });
  }
  for (const u of users || []) {
    all.push({
      email: u.email, phone: u.phone,
      first_name: u.display_name, last_name: null,
      country: null, marketing: false,
      source: `user:${u.role}`, date: u.created_at,
    });
  }

  // Dedupe
  const map = new Map();
  for (const c of all) {
    const key = (c.email?.toLowerCase() || c.phone?.replace(/[^0-9]/g, "") || "").trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, c);
  }

  for (const c of map.values()) {
    rows.push([
      c.email || "",
      c.phone || "",
      c.first_name || "",
      c.last_name || "",
      c.country || "",
      c.marketing ? "כן" : "לא",
      c.source || "",
      c.date ? new Date(c.date).toLocaleDateString("he-IL") : "",
      c.email && unsubSet.has(c.email.toLowerCase()) ? "כן" : "לא",
    ]);
  }

  const body = "\uFEFF" + rows.map((r) => r.map(csv).join(",")).join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="marketing-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
